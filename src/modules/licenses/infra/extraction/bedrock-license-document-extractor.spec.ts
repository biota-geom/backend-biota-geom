import Anthropic from '@anthropic-ai/sdk';
import { AnthropicBedrock } from '@anthropic-ai/bedrock-sdk';
import { LicenseExtractionTimeoutError } from '../../domain/errors/license-extraction-timeout.error';
import { LicenseExtractionUnavailableError } from '../../domain/errors/license-extraction-unavailable.error';
import { UnreadableLicenseDocumentError } from '../../domain/errors/unreadable-license-document.error';
import { LICENSE_EXTRACTION_SYSTEM_PROMPT } from '../../prompts/license-extraction.prompt';
import { BedrockConfigService } from './bedrock-config.service';
import { BedrockLicenseDocumentExtractor } from './bedrock-license-document-extractor';
import { LICENSE_EXTRACTION_OUTPUT_SCHEMA } from './license-extraction.schema';

// The client is replaced by a fake whose messages.stream() is driven by each
// test; the real SDK error classes are still used to build failures.
const stream = jest.fn();
jest.mock('@anthropic-ai/bedrock-sdk', () => ({
  AnthropicBedrock: jest.fn().mockImplementation(() => ({
    messages: { stream },
  })),
}));

const PDF = Buffer.from('%PDF-1.7\nlicense');

const MODEL_ANSWER = JSON.stringify({
  extracted_data: {
    type: 'LO',
    process_number: 'LO nº 118/2020',
    issuing_agency: 'FEPAM',
    issue_date: '2020-01-10',
    expiration_date: '2025-01-10',
  },
  sections: [
    {
      descriptor: 'Resíduos Sólidos',
      items: [
        {
          number: '1.1',
          description: 'Apresentar relatório semestral',
          condition_type: 'PERIODIC',
          periodicity: 'SEMIANNUAL',
          due_date: null,
        },
      ],
    },
  ],
});

function message(
  text: string,
  overrides: Partial<Anthropic.Message> = {},
): Anthropic.Message {
  return {
    content: [{ type: 'text', text }],
    stop_reason: 'end_turn',
    usage: { input_tokens: 10, output_tokens: 20 },
    ...overrides,
  } as Anthropic.Message;
}

function answers(value: Anthropic.Message | Promise<Anthropic.Message>) {
  stream.mockReturnValue({ finalMessage: () => Promise.resolve(value) });
}

function fails(error: Error) {
  stream.mockReturnValue({ finalMessage: () => Promise.reject(error) });
}

function apiError(status: number, text = 'provider message') {
  return Anthropic.APIError.generate(
    status,
    { error: { message: text } },
    text,
    new Headers(),
  );
}

function build(overrides: Partial<BedrockConfigService> = {}) {
  const config = {
    apiKey: 'secret-api-key',
    modelId: 'global.anthropic.claude-sonnet-5-5',
    region: 'us-east-1',
    timeoutMs: 60_000,
    ...overrides,
  } as BedrockConfigService;

  return new BedrockLicenseDocumentExtractor(config);
}

describe('BedrockLicenseDocumentExtractor', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('sends the PDF to the configured Claude model and returns the validated suggestions', async () => {
    answers(message(MODEL_ANSWER));

    const result = await build().extract(PDF);

    expect(result.extractedData).toEqual({
      type: 'LO',
      processNumber: 'LO nº 118/2020',
      issuingAgency: 'FEPAM',
      issueDate: '2020-01-10',
      expirationDate: '2025-01-10',
    });
    expect(result.suggestedConditions).toHaveLength(1);

    const [params, options] = stream.mock.calls[0] as [
      Anthropic.MessageCreateParams,
      { signal: AbortSignal },
    ];
    expect(params.model).toBe('global.anthropic.claude-sonnet-5-5');
    expect(params.system).toBe(LICENSE_EXTRACTION_SYSTEM_PROMPT);
    expect(params.output_config).toEqual({
      effort: 'low',
      format: { type: 'json_schema', schema: LICENSE_EXTRACTION_OUTPUT_SCHEMA },
    });
    expect(params.messages[0].content[0]).toEqual({
      type: 'document',
      source: {
        type: 'base64',
        media_type: 'application/pdf',
        data: PDF.toString('base64'),
      },
    });
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });

  it('authenticates with the Bedrock API key in the configured region, reusing one client', async () => {
    answers(message(MODEL_ANSWER));
    const extractor = build();

    await extractor.extract(PDF);
    await extractor.extract(PDF);

    expect(AnthropicBedrock).toHaveBeenCalledTimes(1);
    expect(AnthropicBedrock).toHaveBeenCalledWith({
      apiKey: 'secret-api-key',
      awsRegion: 'us-east-1',
    });
  });

  it('is unavailable when no API key is configured, without calling Bedrock', async () => {
    await expect(build({ apiKey: undefined }).extract(PDF)).rejects.toThrow(
      LicenseExtractionUnavailableError,
    );
    expect(stream).not.toHaveBeenCalled();
  });

  it('aborts the call and reports a timeout once the configured limit elapses', async () => {
    stream.mockImplementation(
      (_params: unknown, options: { signal: AbortSignal }) => ({
        finalMessage: () =>
          new Promise((_resolve, reject) => {
            options.signal.addEventListener('abort', () =>
              reject(new Anthropic.APIUserAbortError()),
            );
          }),
      }),
    );

    await expect(build({ timeoutMs: 10 }).extract(PDF)).rejects.toThrow(
      LicenseExtractionTimeoutError,
    );
  });

  it('reports a connection timeout as a timeout', async () => {
    fails(new Anthropic.APIConnectionTimeoutError());

    await expect(build().extract(PDF)).rejects.toThrow(
      LicenseExtractionTimeoutError,
    );
  });

  it('reports a document rejected by Bedrock as unreadable', async () => {
    fails(apiError(400, 'The document could not be processed'));

    await expect(build().extract(PDF)).rejects.toThrow(
      UnreadableLicenseDocumentError,
    );
  });

  it('reports a wrong model id as unavailable, not as a bad document', async () => {
    fails(apiError(400, 'The provided model identifier is invalid.'));

    await expect(build().extract(PDF)).rejects.toThrow(
      LicenseExtractionUnavailableError,
    );
  });

  it.each([401, 403, 404, 429, 500, 503])(
    'reports HTTP %s as unavailable',
    async (status) => {
      fails(apiError(status));

      await expect(build().extract(PDF)).rejects.toThrow(
        LicenseExtractionUnavailableError,
      );
    },
  );

  it('reports an unexpected failure as unavailable', async () => {
    fails(new TypeError('fetch failed'));

    await expect(build().extract(PDF)).rejects.toThrow(
      LicenseExtractionUnavailableError,
    );
  });

  it('never exposes the provider message in the domain error', async () => {
    fails(apiError(403, 'token secret-api-key rejected'));

    const error = (await build()
      .extract(PDF)
      .catch((e: unknown) => e)) as Error;

    expect(error.message).not.toContain('secret-api-key');
  });

  it('reports an answer the model declined as unreadable', async () => {
    answers(
      message('', {
        stop_reason: 'refusal',
        stop_details: {
          type: 'refusal',
          category: 'general_harms',
          explanation: null,
        },
      }),
    );

    await expect(build().extract(PDF)).rejects.toThrow(
      UnreadableLicenseDocumentError,
    );
  });

  it('reports an answer cut short by max_tokens as unreadable', async () => {
    answers(message(MODEL_ANSWER.slice(0, 80), { stop_reason: 'max_tokens' }));

    await expect(build().extract(PDF)).rejects.toThrow(
      UnreadableLicenseDocumentError,
    );
  });

  it('treats an answer without text as unreadable', async () => {
    answers(message('', { content: [] }));

    await expect(build().extract(PDF)).rejects.toThrow(
      UnreadableLicenseDocumentError,
    );
  });
});

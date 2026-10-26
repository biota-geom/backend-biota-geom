import {
  BedrockRuntimeClient,
  ConverseCommand,
  ConverseCommandOutput,
} from '@aws-sdk/client-bedrock-runtime';
import { LicenseExtractionTimeoutError } from '../../domain/errors/license-extraction-timeout.error';
import { LicenseExtractionUnavailableError } from '../../domain/errors/license-extraction-unavailable.error';
import { UnreadableLicenseDocumentError } from '../../domain/errors/unreadable-license-document.error';
import { LICENSE_EXTRACTION_SYSTEM_PROMPT } from '../../prompts/license-extraction.prompt';
import { BedrockConfigService } from './bedrock-config.service';
import { BedrockLicenseDocumentExtractor } from './bedrock-license-document-extractor';

const PDF = Buffer.from('%PDF-1.7\nlicense');

const MODEL_ANSWER = JSON.stringify({
  extracted_data: {
    type: 'LO',
    process_number: 'LO nº 118/2020',
    issuing_agency: 'FEPAM',
    issue_date: '2020-01-10',
    expiration_date: '2025-01-10',
  },
  suggested_conditions: [{ description: 'Apresentar relatório semestral' }],
});

function converseOutput(
  text: string,
  stopReason: ConverseCommandOutput['stopReason'] = 'end_turn',
): ConverseCommandOutput {
  return {
    output: { message: { role: 'assistant', content: [{ text }] } },
    stopReason,
  } as ConverseCommandOutput;
}

function namedError(name: string, message = 'provider message'): Error {
  const error = new Error(message);
  error.name = name;
  return error;
}

function build(overrides: Partial<BedrockConfigService> = {}) {
  const config = {
    apiKey: 'secret-api-key',
    modelId: 'us.amazon.nova-2-lite-v1:0',
    region: 'us-east-1',
    timeoutMs: 60_000,
    ...overrides,
  } as BedrockConfigService;

  return new BedrockLicenseDocumentExtractor(config);
}

describe('BedrockLicenseDocumentExtractor', () => {
  let send: jest.SpyInstance;

  beforeEach(() => {
    send = jest.spyOn(BedrockRuntimeClient.prototype, 'send');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sends the PDF to the configured Nova model and returns the validated suggestions', async () => {
    send.mockResolvedValue(converseOutput(MODEL_ANSWER));

    const result = await build().extract(PDF);

    expect(result.extractedData).toEqual({
      type: 'LO',
      processNumber: 'LO nº 118/2020',
      issuingAgency: 'FEPAM',
      issueDate: '2020-01-10',
      expirationDate: '2025-01-10',
    });
    expect(result.suggestedConditions).toHaveLength(1);

    const [command, options] = send.mock.calls[0] as [
      ConverseCommand,
      { abortSignal: AbortSignal },
    ];
    expect(command).toBeInstanceOf(ConverseCommand);
    expect(command.input.modelId).toBe('us.amazon.nova-2-lite-v1:0');
    expect(command.input.system).toEqual([
      { text: LICENSE_EXTRACTION_SYSTEM_PROMPT },
    ]);
    expect(command.input.inferenceConfig?.temperature).toBe(0);
    expect(command.input.messages?.[0].content?.[0]).toEqual({
      document: {
        format: 'pdf',
        name: 'licenca-ambiental',
        source: { bytes: PDF },
      },
    });
    expect(options.abortSignal).toBeInstanceOf(AbortSignal);
  });

  it('authenticates with the Bedrock API key as a bearer token in the configured region', async () => {
    send.mockResolvedValue(converseOutput(MODEL_ANSWER));
    const extractor = build();

    await extractor.extract(PDF);
    await extractor.extract(PDF);

    const clients = send.mock.contexts as BedrockRuntimeClient[];
    // One client is built lazily and reused across requests.
    expect(clients[0]).toBe(clients[1]);
    await expect(clients[0].config.region()).resolves.toBe('us-east-1');
    const tokenProvider = clients[0].config.token as unknown as () => Promise<{
      token: string;
    }>;
    await expect(tokenProvider()).resolves.toEqual(
      expect.objectContaining({ token: 'secret-api-key' }),
    );
  });

  it('is unavailable when no API key is configured, without calling Bedrock', async () => {
    await expect(build({ apiKey: undefined }).extract(PDF)).rejects.toThrow(
      LicenseExtractionUnavailableError,
    );
    expect(send).not.toHaveBeenCalled();
  });

  it('aborts the call and reports a timeout once the configured limit elapses', async () => {
    send.mockImplementation(
      (_command: unknown, options: { abortSignal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          options.abortSignal.addEventListener('abort', () =>
            reject(namedError('AbortError', 'Request aborted')),
          );
        }),
    );

    await expect(build({ timeoutMs: 10 }).extract(PDF)).rejects.toThrow(
      LicenseExtractionTimeoutError,
    );
  });

  it('reports a model-side timeout as a timeout', async () => {
    send.mockRejectedValue(namedError('ModelTimeoutException'));

    await expect(build().extract(PDF)).rejects.toThrow(
      LicenseExtractionTimeoutError,
    );
  });

  it('reports a document rejected by Bedrock as unreadable', async () => {
    send.mockRejectedValue(
      namedError('ValidationException', 'The document could not be processed'),
    );

    await expect(build().extract(PDF)).rejects.toThrow(
      UnreadableLicenseDocumentError,
    );
  });

  it('reports a wrong model id as unavailable, not as a bad document', async () => {
    send.mockRejectedValue(
      namedError(
        'ValidationException',
        'The provided model identifier is invalid.',
      ),
    );

    await expect(build().extract(PDF)).rejects.toThrow(
      LicenseExtractionUnavailableError,
    );
  });

  it.each([
    'AccessDeniedException',
    'UnrecognizedClientException',
    'ThrottlingException',
    'ServiceUnavailableException',
    'SomethingUnexpected',
  ])('reports %s as unavailable', async (name) => {
    send.mockRejectedValue(namedError(name));

    await expect(build().extract(PDF)).rejects.toThrow(
      LicenseExtractionUnavailableError,
    );
  });

  it('never exposes the provider message in the domain error', async () => {
    send.mockRejectedValue(
      namedError('AccessDeniedException', 'token secret-api-key rejected'),
    );

    const error = (await build()
      .extract(PDF)
      .catch((e: unknown) => e)) as Error;

    expect(error.message).not.toContain('secret-api-key');
  });

  it.each(['content_filtered', 'guardrail_intervened'] as const)(
    'reports an answer stopped by %s as unreadable',
    async (stopReason) => {
      send.mockResolvedValue(converseOutput(MODEL_ANSWER, stopReason));

      await expect(build().extract(PDF)).rejects.toThrow(
        UnreadableLicenseDocumentError,
      );
    },
  );

  it('reports an answer that is not the expected JSON as unreadable', async () => {
    send.mockResolvedValue(converseOutput('Desculpe, não consigo ajudar.'));

    await expect(build().extract(PDF)).rejects.toThrow(
      UnreadableLicenseDocumentError,
    );
  });

  it('treats an answer without content as unreadable', async () => {
    send.mockResolvedValue({ stopReason: 'end_turn' });

    await expect(build().extract(PDF)).rejects.toThrow(
      UnreadableLicenseDocumentError,
    );
  });
});

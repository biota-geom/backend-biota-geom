import { Injectable, Logger } from '@nestjs/common';
import {
  BedrockRuntimeClient,
  ConverseCommand,
  ConverseCommandOutput,
} from '@aws-sdk/client-bedrock-runtime';
import { LicenseExtractionTimeoutError } from '../../domain/errors/license-extraction-timeout.error';
import { LicenseExtractionUnavailableError } from '../../domain/errors/license-extraction-unavailable.error';
import { UnreadableLicenseDocumentError } from '../../domain/errors/unreadable-license-document.error';
import {
  LicenseDocumentExtractor,
  LicenseExtraction,
} from '../../domain/license-extraction';
import {
  LICENSE_EXTRACTION_SYSTEM_PROMPT,
  LICENSE_EXTRACTION_USER_PROMPT,
} from '../../prompts/license-extraction.prompt';
import { BedrockConfigService } from './bedrock-config.service';
import { parseLicenseExtraction } from './license-extraction.schema';

// A long license lists dozens of conditions; this leaves room for all of them
// without letting a runaway answer stream for the whole timeout.
const MAX_OUTPUT_TOKENS = 12_000;

// Converse document names only accept a restricted character set, and the
// name is visible to the model — a fixed one avoids leaking the user's file
// name and any validation error from odd characters in it.
const DOCUMENT_NAME = 'licenca-ambiental';

// Errors raised by Bedrock (or the SDK) that mean "the service could not be
// used right now", as opposed to "this document cannot be read".
const PROVIDER_ERROR_NAMES = new Set([
  'AccessDeniedException',
  'UnrecognizedClientException',
  'ExpiredTokenException',
  'ResourceNotFoundException',
  'ThrottlingException',
  'ServiceQuotaExceededException',
  'ServiceUnavailableException',
  'InternalServerException',
  'ModelNotReadyException',
  'ModelErrorException',
]);

// A ValidationException is usually about the document (corrupted, too many
// pages, unsupported content), but a wrong BEDROCK_MODEL_ID / inference
// profile is reported the same way and is a configuration problem instead.
const MODEL_CONFIGURATION_ERROR = /model|inference profile/i;

/*
 * Reads the PDF with Amazon Nova 2 Lite through the Bedrock Converse API,
 * authenticated with a Bedrock API key (bearer token) that never leaves the
 * backend. Nothing is persisted: the PDF goes to the model and the validated
 * suggestions come back.
 */
@Injectable()
export class BedrockLicenseDocumentExtractor implements LicenseDocumentExtractor {
  private readonly logger = new Logger(BedrockLicenseDocumentExtractor.name);
  private client?: BedrockRuntimeClient;

  constructor(private readonly config: BedrockConfigService) {}

  async extract(document: Buffer): Promise<LicenseExtraction> {
    const output = await this.converse(document);

    if (
      output.stopReason === 'guardrail_intervened' ||
      output.stopReason === 'content_filtered'
    ) {
      throw new UnreadableLicenseDocumentError(
        `model stopped with ${output.stopReason}`,
      );
    }

    const text = (output.output?.message?.content ?? [])
      .map((block) => block.text ?? '')
      .join('');

    return parseLicenseExtraction(text);
  }

  private async converse(document: Buffer): Promise<ConverseCommandOutput> {
    const client = this.getClient();
    const timeoutMs = this.config.timeoutMs;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await client.send(
        new ConverseCommand({
          modelId: this.config.modelId,
          system: [{ text: LICENSE_EXTRACTION_SYSTEM_PROMPT }],
          messages: [
            {
              role: 'user',
              content: [
                {
                  document: {
                    format: 'pdf',
                    name: DOCUMENT_NAME,
                    source: { bytes: document },
                  },
                },
                { text: LICENSE_EXTRACTION_USER_PROMPT },
              ],
            },
          ],
          inferenceConfig: {
            maxTokens: MAX_OUTPUT_TOKENS,
            temperature: 0,
          },
        }),
        { abortSignal: controller.signal },
      );
    } catch (error) {
      throw this.toDomainError(error, controller.signal.aborted, timeoutMs);
    } finally {
      clearTimeout(timer);
    }
  }

  private getClient(): BedrockRuntimeClient {
    const apiKey = this.config.apiKey;
    if (!apiKey) {
      throw new LicenseExtractionUnavailableError(
        'AWS_BEARER_TOKEN_BEDROCK is not configured',
      );
    }

    this.client ??= new BedrockRuntimeClient({
      region: this.config.region,
      token: { token: apiKey },
      authSchemePreference: ['httpBearerAuth'],
    });

    return this.client;
  }

  private toDomainError(
    error: unknown,
    aborted: boolean,
    timeoutMs: number,
  ): Error {
    const name = error instanceof Error ? error.name : 'UnknownError';
    const message = error instanceof Error ? error.message : '';

    if (aborted || name === 'AbortError' || name === 'ModelTimeoutException') {
      this.logger.warn(`Bedrock extraction timed out after ${timeoutMs}ms`);
      return new LicenseExtractionTimeoutError(timeoutMs);
    }

    // Only the error name is logged: SDK messages can echo request details,
    // and the credential must never end up in the logs.
    if (
      name === 'ValidationException' &&
      !MODEL_CONFIGURATION_ERROR.test(message)
    ) {
      this.logger.warn(`Bedrock rejected the document (${name})`);
      return new UnreadableLicenseDocumentError(name);
    }

    this.logger.error(
      PROVIDER_ERROR_NAMES.has(name) || name === 'ValidationException'
        ? `Bedrock is unavailable or misconfigured (${name})`
        : `Unexpected Bedrock failure (${name})`,
    );

    return new LicenseExtractionUnavailableError(name);
  }
}

import { Injectable, Logger } from '@nestjs/common';
import Anthropic, { APIError } from '@anthropic-ai/sdk';
import { AnthropicBedrock } from '@anthropic-ai/bedrock-sdk';
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
import {
  LICENSE_EXTRACTION_OUTPUT_SCHEMA,
  parseLicenseExtraction,
} from './license-extraction.schema';

// A long license lists close to a hundred conditions; this leaves room for
// all of them plus the model's thinking. The request streams, so a large
// limit does not run into HTTP timeouts.
const MAX_OUTPUT_TOKENS = 32_000;

// A 400 is usually about the document (corrupted, too many pages), but a
// wrong BEDROCK_MODEL_ID / inference profile is reported the same way and is
// a configuration problem instead.
const MODEL_CONFIGURATION_ERROR = /model|inference profile/i;

/*
 * Reads the PDF with Claude (Claude Sonnet 5.5 by default) on Amazon Bedrock,
 * authenticated with a Bedrock API key (bearer token) that never leaves the
 * backend. Nothing is persisted: the PDF goes to the model and the validated
 * suggestions come back.
 */
@Injectable()
export class BedrockLicenseDocumentExtractor implements LicenseDocumentExtractor {
  private readonly logger = new Logger(BedrockLicenseDocumentExtractor.name);
  private client?: AnthropicBedrock;

  constructor(private readonly config: BedrockConfigService) {}

  async extract(document: Buffer): Promise<LicenseExtraction> {
    const message = await this.read(document);

    if (message.stop_reason === 'refusal') {
      throw new UnreadableLicenseDocumentError(
        `model declined (${message.stop_details?.category ?? 'no category'})`,
      );
    }

    if (message.stop_reason === 'max_tokens') {
      // The JSON is cut short and will not parse; worth a log of its own.
      this.logger.warn(
        `Extraction hit max_tokens (${MAX_OUTPUT_TOKENS}); the answer is incomplete`,
      );
    }

    const text = message.content
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('');

    return parseLicenseExtraction(text);
  }

  private async read(document: Buffer): Promise<Anthropic.Message> {
    const client = this.getClient();
    const timeoutMs = this.config.timeoutMs;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const startedAt = Date.now();

    try {
      const message = await client.messages
        .stream(
          {
            model: this.config.modelId,
            max_tokens: MAX_OUTPUT_TOKENS,
            system: LICENSE_EXTRACTION_SYSTEM_PROMPT,
            output_config: {
              // Extraction needs little reasoning; low effort keeps the
              // thinking short and the reading fast.
              effort: 'low',
              format: {
                type: 'json_schema',
                schema: LICENSE_EXTRACTION_OUTPUT_SCHEMA,
              },
            },
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'document',
                    source: {
                      type: 'base64',
                      media_type: 'application/pdf',
                      data: document.toString('base64'),
                    },
                  },
                  { type: 'text', text: LICENSE_EXTRACTION_USER_PROMPT },
                ],
              },
            ],
          },
          { signal: controller.signal },
        )
        .finalMessage();

      this.logger.log(
        `Extraction read in ${Date.now() - startedAt}ms ` +
          `(${message.usage.input_tokens} in / ${message.usage.output_tokens} out tokens, ` +
          `${message.usage.output_tokens_details?.thinking_tokens ?? 0} of them thinking, ${message.stop_reason})`,
      );

      return message;
    } catch (error) {
      throw this.toDomainError(error, controller.signal.aborted, timeoutMs);
    } finally {
      clearTimeout(timer);
    }
  }

  private getClient(): AnthropicBedrock {
    const apiKey = this.config.apiKey;
    if (!apiKey) {
      throw new LicenseExtractionUnavailableError(
        'AWS_BEARER_TOKEN_BEDROCK is not configured',
      );
    }

    // The explicit apiKey wins over any AWS_ACCESS_KEY_ID in the environment.
    this.client ??= new AnthropicBedrock({
      apiKey,
      awsRegion: this.config.region,
    });

    return this.client;
  }

  private toDomainError(
    error: unknown,
    aborted: boolean,
    timeoutMs: number,
  ): Error {
    if (
      aborted ||
      error instanceof Anthropic.APIUserAbortError ||
      error instanceof Anthropic.APIConnectionTimeoutError
    ) {
      this.logger.warn(`Bedrock extraction timed out after ${timeoutMs}ms`);
      return new LicenseExtractionTimeoutError(timeoutMs);
    }

    // Only the status is logged: SDK messages can echo request details, and
    // the credential must never end up in the logs.
    if (error instanceof Anthropic.APIError) {
      const status = (error as APIError).status ?? 'no status';

      if (
        error instanceof Anthropic.BadRequestError &&
        !MODEL_CONFIGURATION_ERROR.test(error.message)
      ) {
        this.logger.warn(`Bedrock rejected the document (HTTP ${status})`);
        return new UnreadableLicenseDocumentError(`HTTP ${status}`);
      }

      this.logger.error(
        `Bedrock is unavailable or misconfigured (HTTP ${status})`,
      );
      return new LicenseExtractionUnavailableError(`HTTP ${status}`);
    }

    const name = error instanceof Error ? error.name : 'UnknownError';
    this.logger.error(`Unexpected Bedrock failure (${name})`);
    return new LicenseExtractionUnavailableError(name);
  }
}

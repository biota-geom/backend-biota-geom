import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvVars } from '../../../../config/env.validation';

@Injectable()
export class BedrockConfigService {
  constructor(private readonly config: ConfigService<EnvVars, true>) {}

  get apiKey(): string | undefined {
    return this.config.get('AWS_BEARER_TOKEN_BEDROCK', { infer: true });
  }

  get modelId(): string {
    return this.config.get('BEDROCK_MODEL_ID', { infer: true });
  }

  get region(): string {
    return this.config.get('AWS_REGION', { infer: true });
  }

  get timeoutMs(): number {
    return this.config.get('BEDROCK_TIMEOUT_MS', { infer: true });
  }
}

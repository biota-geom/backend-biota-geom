import { ConfigService } from '@nestjs/config';
import { EnvVars } from '../../../../config/env.validation';
import { BedrockConfigService } from './bedrock-config.service';

describe('BedrockConfigService', () => {
  it('reads every Bedrock setting from ConfigService', () => {
    const values: Partial<EnvVars> = {
      AWS_BEARER_TOKEN_BEDROCK: 'api-key',
      BEDROCK_MODEL_ID: 'us.amazon.nova-2-lite-v1:0',
      AWS_REGION: 'us-east-1',
      BEDROCK_TIMEOUT_MS: 60_000,
    };
    const config = {
      get: jest.fn((key: keyof EnvVars) => values[key]),
    } as unknown as ConfigService<EnvVars, true>;
    const service = new BedrockConfigService(config);

    expect(service.apiKey).toBe('api-key');
    expect(service.modelId).toBe('us.amazon.nova-2-lite-v1:0');
    expect(service.region).toBe('us-east-1');
    expect(service.timeoutMs).toBe(60_000);
  });
});

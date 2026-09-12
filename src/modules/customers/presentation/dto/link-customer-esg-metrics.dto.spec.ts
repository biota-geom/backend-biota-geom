import { describe, expect, it } from '@jest/globals';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LinkCustomerEsgMetricsDto } from './link-customer-esg-metrics.dto';

const METRIC_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

function toDto(plain: Record<string, unknown>): LinkCustomerEsgMetricsDto {
  return plainToInstance(LinkCustomerEsgMetricsDto, plain);
}

describe('LinkCustomerEsgMetricsDto', () => {
  it('accepts a list of uuids', async () => {
    const errors = await validate(toDto({ metric_ids: [METRIC_ID] }));

    expect(errors).toHaveLength(0);
  });

  it('accepts an empty list', async () => {
    const errors = await validate(toDto({ metric_ids: [] }));

    expect(errors).toHaveLength(0);
  });

  it('rejects a missing list', async () => {
    const errors = await validate(toDto({}));

    expect(errors.map((error) => error.property)).toContain('metric_ids');
  });

  it('rejects a non-uuid item', async () => {
    const errors = await validate(toDto({ metric_ids: ['not-a-uuid'] }));

    expect(errors.map((error) => error.property)).toContain('metric_ids');
  });
});

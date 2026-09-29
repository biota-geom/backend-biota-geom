import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import {
  LicenseConditionStatusFilter,
  ListLicenseConditionsQueryDto,
} from './list-license-conditions-query.dto';

function validate(payload: Record<string, unknown>) {
  const dto = plainToInstance(ListLicenseConditionsQueryDto, payload);

  return validateSync(dto, { whitelist: true });
}

describe('ListLicenseConditionsQueryDto', () => {
  it.each([
    undefined,
    LicenseConditionStatusFilter.ALL,
    LicenseConditionStatusFilter.REGULAR,
    LicenseConditionStatusFilter.ATTENTION,
    LicenseConditionStatusFilter.RISK,
  ])('accepts status %s', (status) => {
    const payload = status === undefined ? {} : { status };

    expect(validate(payload)).toHaveLength(0);
  });

  it('rejects an unsupported status', () => {
    expect(
      validate({ status: 'URGENT' }).map((error) => error.property),
    ).toContain('status');
  });
});

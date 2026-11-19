import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { UpdateLicenseLegislationDto } from './update-license-legislation.dto';

function validate(body: Record<string, unknown>) {
  return validateSync(plainToInstance(UpdateLicenseLegislationDto, body));
}

describe('UpdateLicenseLegislationDto', () => {
  it('accepts an empty body', () => {
    expect(validate({})).toHaveLength(0);
  });

  it.each(['HIGH', 'MODERATE', 'LOW', null])('accepts impact %s', (impact) => {
    expect(validate({ impact })).toHaveLength(0);
  });

  it('rejects an unknown impact', () => {
    expect(validate({ impact: 'CRITICAL' })).toHaveLength(1);
  });

  it('accepts read: true together with impact', () => {
    expect(validate({ impact: 'LOW', read: true })).toHaveLength(0);
  });

  it.each([false, null, 'true', 1])('rejects read: %p', (read) => {
    expect(validate({ read })).toHaveLength(1);
  });

  it('accepts a technical analysis up to 10.000 characters', () => {
    expect(validate({ technical_analysis: 'a'.repeat(10000) })).toHaveLength(0);
  });

  it.each([null, ''])('accepts technical_analysis %p to clear it', (value) => {
    expect(validate({ technical_analysis: value })).toHaveLength(0);
  });

  it('rejects a technical analysis over 10.000 characters', () => {
    expect(validate({ technical_analysis: 'a'.repeat(10001) })).toHaveLength(1);
  });

  it('rejects a non-string technical analysis', () => {
    expect(validate({ technical_analysis: 123 })).toHaveLength(1);
  });
});

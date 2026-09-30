import { validateSync } from 'class-validator';
import { CreateLicenseConditionsResponseDto } from './create-license-conditions-response.dto';

describe('CreateLicenseConditionsResponseDto', () => {
  it('accepts a valid response', () => {
    const dto = Object.assign(new CreateLicenseConditionsResponseDto(), {
      count: 2,
      message: 'Condicionantes vinculadas com sucesso',
    });

    expect(validateSync(dto)).toHaveLength(0);
  });
});

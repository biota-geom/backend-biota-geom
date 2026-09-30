import { LicenseRepository } from '../domain/licenses.repository';
import { CreateLicenseConditionCategoryUseCase } from './create-license-condition-category.use-case';

describe('CreateLicenseConditionCategoryUseCase', () => {
  it('delegates category creation', async () => {
    const category = { id: 'category-1', name: 'Emissões' };
    const createConditionCategory = jest.fn().mockResolvedValue(category);
    const useCase = new CreateLicenseConditionCategoryUseCase({
      createConditionCategory,
    } as unknown as LicenseRepository);

    await expect(useCase.execute('Emissões')).resolves.toBe(category);
    expect(createConditionCategory).toHaveBeenCalledWith('Emissões');
  });
});

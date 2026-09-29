import { Injectable } from '@nestjs/common';
import { LicenseConditionCategory } from '../domain/license-condition-category.entity';
import { LicenseRepository } from '../domain/licenses.repository';

@Injectable()
export class CreateLicenseConditionCategoryUseCase {
  constructor(private readonly repository: LicenseRepository) {}

  execute(name: string): Promise<LicenseConditionCategory> {
    return this.repository.createConditionCategory(name);
  }
}

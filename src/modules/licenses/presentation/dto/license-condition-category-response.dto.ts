import { ApiProperty } from '@nestjs/swagger';
import { LicenseConditionCategory } from '../../domain/license-condition-category.entity';

export class LicenseConditionCategoryResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Documental' })
  name!: string;

  @ApiProperty({ format: 'date-time' })
  created_at!: string;
}

export function toLicenseConditionCategoryResponse(
  category: LicenseConditionCategory,
): LicenseConditionCategoryResponseDto {
  return {
    id: category.id,
    name: category.name,
    created_at: category.createdAt.toISOString(),
  };
}

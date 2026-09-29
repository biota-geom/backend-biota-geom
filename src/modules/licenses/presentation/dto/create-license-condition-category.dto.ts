import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateLicenseConditionCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;
}

import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class ConditionDto {
  @IsString()
  @IsNotEmpty()
  item_number: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsIn(['PERIODIC', 'INFORMATIVE'])
  condition_type: string;

  @IsString()
  @IsIn(['MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL'])
  periodicity: string;

  @IsDateString()
  deadline: string;

  @IsString()
  @IsNotEmpty()
  responsible_name: string;

  @IsOptional()
  @IsUUID()
  category_id?: string;
}

export class CreateLicenseConditionsDto {
  @ValidateNested({ each: true })
  @Type(() => ConditionDto)
  @ArrayMinSize(1)
  conditions: ConditionDto[];
}

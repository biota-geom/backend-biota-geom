import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ConditionDto {
  @IsString()
  @IsNotEmpty()
  item_number: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title?: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsIn(['PERIODIC', 'INFORMATIVE'])
  condition_type: string;

  // Only periodic conditions repeat; informative ones have no periodicity.
  @IsOptional()
  @IsString()
  @IsIn(['MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL'])
  periodicity?: string;

  @IsDateString()
  deadline: string;

  @IsString()
  @IsNotEmpty()
  responsible_name: string;

  // GRI parameter (US02) linked to the customer that categorizes the condition.
  @IsUUID()
  esg_metric_id: string;
}

export class CreateLicenseConditionsDto {
  @ValidateNested({ each: true })
  @Type(() => ConditionDto)
  @ArrayMinSize(1)
  conditions: ConditionDto[];
}

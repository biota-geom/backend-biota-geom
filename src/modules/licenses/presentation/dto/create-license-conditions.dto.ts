import { Type } from 'class-transformer';
import {
  Allow,
  ArrayMinSize,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ConditionDto {
  // Legacy clients may still send this value; numbering is computed on read.
  @Allow()
  item_number?: unknown;

  // Legacy compliance-target fields remain whitelisted and are ignored.
  @Allow()
  target_metric_id?: unknown;

  @Allow()
  target_operator?: unknown;

  @Allow()
  target_value?: unknown;

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

  @IsOptional()
  @IsString()
  @IsIn(['MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL'])
  periodicity?: string;

  @IsDateString()
  deadline: string;

  @IsString()
  @IsNotEmpty()
  responsible_name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  environmental_descriptor: string;

  @IsOptional()
  @IsBoolean()
  has_delivery?: boolean;
}

export class CreateLicenseConditionsDto {
  @ValidateNested({ each: true })
  @Type(() => ConditionDto)
  @ArrayMinSize(1)
  conditions: ConditionDto[];
}

import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsString,
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
}

export class CreateLicenseConditionsDto {
  @ValidateNested({ each: true })
  @Type(() => ConditionDto)
  @ArrayMinSize(1)
  conditions: ConditionDto[];
}

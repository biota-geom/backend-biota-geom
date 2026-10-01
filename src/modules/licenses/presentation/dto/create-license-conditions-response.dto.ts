import { IsNumber, IsString } from 'class-validator';

export class CreateLicenseConditionsResponseDto {
  @IsNumber()
  count: number;
  @IsString()
  message: string;
}

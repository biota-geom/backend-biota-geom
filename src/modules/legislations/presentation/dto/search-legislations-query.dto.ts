import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class SearchLegislationsQueryDto {
  @ApiProperty({ example: '12.305' })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  search!: string;
}

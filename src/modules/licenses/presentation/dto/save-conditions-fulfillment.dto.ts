import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class ConditionFulfillmentItemDto {
  @ApiProperty({ format: 'uuid', description: 'ID da condicionante.' })
  @IsUUID()
  condition_id!: string;

  @ApiProperty({
    type: Boolean,
    description: 'true = Cumprida; false = Não cumprida.',
  })
  @IsBoolean()
  fulfilled!: boolean;
}

export class SaveConditionsFulfillmentDto {
  @ApiProperty({
    type: ConditionFulfillmentItemDto,
    isArray: true,
    description: 'Lista com uma entrada por condicionante.',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConditionFulfillmentItemDto)
  @ArrayMinSize(1)
  items!: ConditionFulfillmentItemDto[];
}

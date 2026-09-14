import { BadRequestException, PipeTransform } from '@nestjs/common';
import { z } from 'zod';

export interface ZodValidationPipeOptions {
  fallbackMessage: string;
  knownMessages?: readonly string[];
}

export class ZodValidationPipe<
  TSchema extends z.ZodType,
> implements PipeTransform<unknown, z.output<TSchema>> {
  constructor(
    private readonly schema: TSchema,
    private readonly options: ZodValidationPipeOptions,
  ) {}

  transform(value: unknown): z.output<TSchema> {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      const rawMessage = result.error.issues[0]?.message;
      const isKnown =
        !!rawMessage &&
        (!this.options.knownMessages ||
          this.options.knownMessages.includes(rawMessage));

      throw new BadRequestException(
        isKnown ? rawMessage : this.options.fallbackMessage,
      );
    }

    return result.data;
  }
}

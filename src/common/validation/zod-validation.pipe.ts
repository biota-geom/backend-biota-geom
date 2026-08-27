import { BadRequestException, PipeTransform } from '@nestjs/common';
import { z } from 'zod';

export interface ZodValidationPipeOptions {
  fallbackMessage: string;
  // When provided, a Zod issue message is only surfaced to the client if it
  // is one of these known, pre-approved (PT-BR) strings — any other message
  // (e.g. Zod's default English text) falls back to `fallbackMessage`. This
  // is what stops an unreviewed validation message from ever reaching a user.
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

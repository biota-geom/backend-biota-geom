import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe';

const schema = z.object({
  password: z.string().min(8, { message: 'too short' }),
});

describe('ZodValidationPipe', () => {
  it('returns the parsed value on success', () => {
    const pipe = new ZodValidationPipe(schema, { fallbackMessage: 'fallback' });

    expect(pipe.transform({ password: 'longenough' })).toEqual({
      password: 'longenough',
    });
  });

  it('surfaces a known message as-is', () => {
    const pipe = new ZodValidationPipe(schema, {
      fallbackMessage: 'fallback',
      knownMessages: ['too short'],
    });

    expect(() => pipe.transform({ password: 'a' })).toThrow(
      new BadRequestException('too short'),
    );
  });

  it('falls back to the generic message when knownMessages is set but does not include the issue', () => {
    const pipe = new ZodValidationPipe(schema, {
      fallbackMessage: 'fallback',
      knownMessages: ['some other message'],
    });

    expect(() => pipe.transform({ password: 'a' })).toThrow(
      new BadRequestException('fallback'),
    );
  });

  it('surfaces the raw message when knownMessages is not provided', () => {
    const pipe = new ZodValidationPipe(schema, { fallbackMessage: 'fallback' });

    expect(() => pipe.transform({ password: 'a' })).toThrow(
      new BadRequestException('too short'),
    );
  });
});

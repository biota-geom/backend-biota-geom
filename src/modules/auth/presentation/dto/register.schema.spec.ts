import { AUTH_MESSAGES } from '../messages/auth.messages.pt-br';
import { registerSchema } from './register.schema';

const VALID = {
  name: 'Lucas Arieta',
  email: 'Lucas.Arieta@Biotageom.com.br',
  password: 'Sup3r$ecret!',
  password_confirmation: 'Sup3r$ecret!',
};

describe('registerSchema', () => {
  it('accepts a valid payload and lowercases/trims the email', () => {
    const result = registerSchema.parse(VALID);

    expect(result).toEqual({
      name: 'Lucas Arieta',
      email: 'lucas.arieta@biotageom.com.br',
      password: 'Sup3r$ecret!',
    });
  });

  it.each([
    ['too short', 'Ab1!'],
    ['no uppercase', 'sup3r$ecret!'],
    ['no lowercase', 'SUP3R$ECRET!'],
    ['no digit', 'Super$ecret!'],
    ['no special char', 'Sup3rSecret1'],
  ])('rejects a password that is %s', (_label, password) => {
    const result = registerSchema.safeParse({
      ...VALID,
      password,
      password_confirmation: password,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(AUTH_MESSAGES.WEAK_PASSWORD);
    }
  });

  it('rejects a mismatched confirmation with a dedicated message', () => {
    const result = registerSchema.safeParse({
      ...VALID,
      password_confirmation: 'Different1!',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        AUTH_MESSAGES.PASSWORD_CONFIRMATION_MISMATCH,
      );
    }
  });

  it('never surfaces the allowed email domain in a validation message', () => {
    const result = registerSchema.safeParse({
      ...VALID,
      email: 'not-an-email',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const allMessages = result.error.issues
        .map((issue) => issue.message)
        .join(' ');
      expect(allMessages.toLowerCase()).not.toContain('biotageom');
    }
  });
});

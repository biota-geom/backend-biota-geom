import { z } from 'zod';
import { isPasswordStrongEnough } from '../../domain/password-policy';
import { AUTH_MESSAGES } from '../messages/auth.messages.pt-br';

// The email domain allowlist is intentionally NOT checked here — it is a
// domain policy enforced inside RegisterUserUseCase, so a disallowed domain
// produces a 403 (indistinguishable from a duplicate-email 403) rather than a
// 400 that would confirm the allowlist rule exists.
export const registerSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: z.email().trim().toLowerCase().max(255),
    password: z
      .string()
      .refine(isPasswordStrongEnough, { message: AUTH_MESSAGES.WEAK_PASSWORD }),
    password_confirmation: z.string(),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: AUTH_MESSAGES.PASSWORD_CONFIRMATION_MISMATCH,
    path: ['password_confirmation'],
  })
  .transform((data) => ({
    name: data.name,
    email: data.email,
    password: data.password,
  }));

export type RegisterRequest = z.output<typeof registerSchema>;

import { z } from 'zod';

/*
 * Deliberately does NOT apply the password-strength policy — that would let
 * an attacker learn the policy from a login attempt and would reject users
 * whose password predates the policy.
 */
export const loginSchema = z
  .object({
    email: z.email().trim().toLowerCase(),
    password: z.string().min(1),
  })
  .transform((data) => ({ email: data.email, password: data.password }));

export type LoginRequest = z.output<typeof loginSchema>;

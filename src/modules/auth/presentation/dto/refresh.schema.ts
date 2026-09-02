import { z } from 'zod';

export const refreshSchema = z
  .object({
    refresh_token: z.string().min(1),
  })
  .transform((data) => ({ refreshToken: data.refresh_token }));

export type RefreshRequest = z.output<typeof refreshSchema>;

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  isActive: boolean;
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}

export interface CreateUserInput {
  name: string;
  email: string;
  passwordHash: string;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

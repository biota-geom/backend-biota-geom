import { User } from '../../users/domain/user.entity';

export interface AuthSessionResult {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
}

export interface RefreshedSessionResult {
  user: User;
  accessToken: string;
  expiresInSeconds: number;
}

import { ApiProperty } from '@nestjs/swagger';
import {
  AuthSessionResult,
  RefreshedSessionResult,
} from '../../application/auth-session.result';
import { toUserResponse, UserResponseDto } from './user-response.dto';

export class AuthResponseDto {
  @ApiProperty()
  access_token!: string;

  @ApiProperty()
  refresh_token!: string;

  @ApiProperty({ enum: ['Bearer'] })
  token_type!: 'Bearer';

  @ApiProperty({
    example: 900,
    description: 'Access token lifetime, in seconds.',
  })
  expires_in!: number;

  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;
}

export class RefreshResponseDto {
  @ApiProperty()
  access_token!: string;

  @ApiProperty({ enum: ['Bearer'] })
  token_type!: 'Bearer';

  @ApiProperty({
    example: 900,
    description: 'Access token lifetime, in seconds.',
  })
  expires_in!: number;

  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;
}

export function toAuthResponse(session: AuthSessionResult): AuthResponseDto {
  return {
    access_token: session.accessToken,
    refresh_token: session.refreshToken,
    token_type: 'Bearer',
    expires_in: session.expiresInSeconds,
    user: toUserResponse(session.user),
  };
}

export function toRefreshResponse(
  session: RefreshedSessionResult,
): RefreshResponseDto {
  return {
    access_token: session.accessToken,
    token_type: 'Bearer',
    expires_in: session.expiresInSeconds,
    user: toUserResponse(session.user),
  };
}

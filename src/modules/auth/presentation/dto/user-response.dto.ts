import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../../users/domain/user.entity';

export class UserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Lucas Arieta' })
  name!: string;

  @ApiProperty({ example: 'lucas.arieta@biotageom.com.br' })
  email!: string;

  @ApiProperty()
  is_active!: boolean;

  @ApiProperty()
  is_admin!: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  created_at!: string;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  last_login_at!: string | null;
}

// Never spread the domain User directly into a response — passwordHash must
// be dropped explicitly here, not by omission convention.
export function toUserResponse(user: User): UserResponseDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    is_active: user.isActive,
    is_admin: user.isAdmin,
    created_at: user.createdAt.toISOString(),
    last_login_at: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
  };
}

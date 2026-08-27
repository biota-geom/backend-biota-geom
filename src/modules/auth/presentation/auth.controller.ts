import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { zodBody } from '../../../common/validation/zod-to-openapi';
import { ZodValidationPipe } from '../../../common/validation/zod-validation.pipe';
import { GetCurrentUserUseCase } from '../application/get-current-user.use-case';
import { LoginUserUseCase } from '../application/login-user.use-case';
import { RefreshAccessTokenUseCase } from '../application/refresh-access-token.use-case';
import { RegisterUserUseCase } from '../application/register-user.use-case';
import {
  AuthResponseDto,
  RefreshResponseDto,
  toAuthResponse,
  toRefreshResponse,
} from './dto/auth-response.dto';
import { loginSchema } from './dto/login.schema';
import type { LoginRequest } from './dto/login.schema';
import { refreshSchema } from './dto/refresh.schema';
import type { RefreshRequest } from './dto/refresh.schema';
import { registerSchema } from './dto/register.schema';
import type { RegisterRequest } from './dto/register.schema';
import { toUserResponse, UserResponseDto } from './dto/user-response.dto';
import { AuthExceptionFilter } from './filters/auth-exception.filter';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AUTH_MESSAGES } from './messages/auth.messages.pt-br';
import { CurrentUser } from './decorators/current-user.decorator';

const KNOWN_MESSAGES = Object.values(AUTH_MESSAGES);

@ApiTags('auth')
@Controller('auth')
@UseFilters(AuthExceptionFilter)
export class AuthController {
  constructor(
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly loginUserUseCase: LoginUserUseCase,
    private readonly refreshAccessTokenUseCase: RefreshAccessTokenUseCase,
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 3, ttl: 3_600_000 } })
  @ApiOperation({ summary: 'Register a new user and issue a session.' })
  @ApiBody({ schema: zodBody(registerSchema) })
  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiResponse({
    status: 400,
    description:
      'Invalid payload, weak password, or password confirmation mismatch.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Registration not authorized (disallowed email domain or email already in use).',
  })
  async register(
    @Body(
      new ZodValidationPipe(registerSchema, {
        fallbackMessage: AUTH_MESSAGES.INVALID_REQUEST,
        knownMessages: KNOWN_MESSAGES,
      }),
    )
    body: RegisterRequest,
  ): Promise<AuthResponseDto> {
    const session = await this.registerUserUseCase.execute(body);
    return toAuthResponse(session);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Authenticate with email and password.' })
  @ApiBody({ schema: zodBody(loginSchema) })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  async login(
    @Body(
      new ZodValidationPipe(loginSchema, {
        fallbackMessage: AUTH_MESSAGES.INVALID_REQUEST,
        knownMessages: KNOWN_MESSAGES,
      }),
    )
    body: LoginRequest,
  ): Promise<AuthResponseDto> {
    const session = await this.loginUserUseCase.execute(body);
    return toAuthResponse(session);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Exchange a refresh token for a new access token.' })
  @ApiBody({ schema: zodBody(refreshSchema) })
  @ApiOkResponse({ type: RefreshResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid or expired session.' })
  async refresh(
    @Body(
      new ZodValidationPipe(refreshSchema, {
        fallbackMessage: AUTH_MESSAGES.INVALID_REQUEST,
        knownMessages: KNOWN_MESSAGES,
      }),
    )
    body: RefreshRequest,
  ): Promise<RefreshResponseDto> {
    const session = await this.refreshAccessTokenUseCase.execute(body);
    return toRefreshResponse(session);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Return the currently authenticated user.' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid or expired session.' })
  async me(@CurrentUser() user: { id: string }): Promise<UserResponseDto> {
    const currentUser = await this.getCurrentUserUseCase.execute(user.id);
    return toUserResponse(currentUser);
  }
}

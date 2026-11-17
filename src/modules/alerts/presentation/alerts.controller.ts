import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { AUTH_MESSAGES } from '../../auth/presentation/messages/auth.messages.pt-br';
import { ListAlertsUseCase } from '../application/list-alerts.use-case';
import { CountUnreadAlertsUseCase } from '../application/count-unread-alerts.use-case';
import { UpdateAlertStatusUseCase } from '../application/update-alert-status.use-case';
import { AlertResponseDto, toAlertResponse } from './dto/alert-response.dto';
import {
  AlertListResponseDto,
  UnreadAlertCountResponseDto,
} from './dto/alert-list-response.dto';
import { ListAlertsQueryDto } from './dto/list-alerts-query.dto';
import { UpdateAlertStatusDto } from './dto/update-alert-status.dto';
import { AlertsExceptionFilter } from './filters/alerts-exception.filter';

@ApiTags('alerts')
@ApiBearerAuth()
@ApiUnauthorizedResponse()
@UseGuards(JwtAuthGuard)
@UseFilters(AlertsExceptionFilter)
@Controller('alerts')
export class AlertsController {
  constructor(
    private readonly listAlerts: ListAlertsUseCase,
    private readonly countUnread: CountUnreadAlertsUseCase,
    private readonly updateStatus: UpdateAlertStatusUseCase,
  ) {}

  @Get()
  @ApiOkResponse({ type: AlertListResponseDto })
  @ApiBadRequestResponse()
  async list(
    @CurrentUser() user: { id: string },
    @Query() query: ListAlertsQueryDto,
  ): Promise<AlertListResponseDto> {
    const result = await this.listAlerts.execute(user.id, {
      status: query.status,
      page: query.page,
      pageSize: query.page_size,
    });
    const now = new Date();
    return {
      items: result.items.map((alert) => toAlertResponse(alert, now)),
      total: result.total,
      page: result.page,
      page_size: result.pageSize,
    };
  }

  @Get('unread-count')
  @ApiOkResponse({ type: UnreadAlertCountResponseDto })
  unreadCount(@CurrentUser() user: { id: string }) {
    return this.countUnread.execute(user.id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: AlertResponseDto })
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  async update(
    @CurrentUser() user: { id: string },
    @Param(
      'id',
      new ParseUUIDPipe({
        exceptionFactory: () =>
          new BadRequestException(AUTH_MESSAGES.INVALID_REQUEST),
      }),
    )
    id: string,
    @Body() body: UpdateAlertStatusDto,
  ): Promise<AlertResponseDto> {
    return toAlertResponse(
      await this.updateStatus.execute(user.id, id, body.status),
    );
  }
}

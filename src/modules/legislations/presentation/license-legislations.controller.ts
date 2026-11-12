import {
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
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { LicensesExceptionFilter } from '../../licenses/presentation/filters/licenses-exception.filter';
import { invalidCustomerIdException } from '../../licenses/presentation/licenses.controller';
import { ListLicenseLegislationsUseCase } from '../application/list-license-legislations.use-case';
import { UpdateLicenseLegislationUseCase } from '../application/update-license-legislation.use-case';
import {
  LicenseLegislationResponseDto,
  toLicenseLegislationResponse,
} from './dto/license-legislation-response.dto';
import { ListLicenseLegislationsQueryDto } from './dto/list-license-legislations-query.dto';
import { UpdateLicenseLegislationDto } from './dto/update-license-legislation.dto';
import { LegislationsExceptionFilter } from './filters/legislations-exception.filter';

const uuidPipe = new ParseUUIDPipe({
  exceptionFactory: invalidCustomerIdException,
});

@ApiTags('legislations')
@UseFilters(LicensesExceptionFilter, LegislationsExceptionFilter)
@Controller('licenses/:licenseId/legislations')
export class LicenseLegislationsController {
  constructor(
    private readonly listLicenseLegislationsUseCase: ListLicenseLegislationsUseCase,
    private readonly updateLicenseLegislationUseCase: UpdateLicenseLegislationUseCase,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiParam({ name: 'licenseId', format: 'uuid' })
  @ApiOperation({
    summary:
      'Lista o radar de legislação da licença, da legislação mais recente para a mais antiga. Aceita ?impact= para filtrar por nível de impacto.',
  })
  @ApiOkResponse({ type: LicenseLegislationResponseDto, isArray: true })
  @ApiNotFoundResponse({ description: 'License not found.' })
  async listLicenseLegislations(
    @Param('licenseId', uuidPipe) licenseId: string,
    @Query() query: ListLicenseLegislationsQueryDto,
    @CurrentUser() user: { id: string },
  ): Promise<LicenseLegislationResponseDto[]> {
    const links = await this.listLicenseLegislationsUseCase.execute(
      licenseId,
      user.id,
      { impact: query.impact },
    );

    return links.map(toLicenseLegislationResponse);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiParam({ name: 'licenseId', format: 'uuid' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOperation({
    summary:
      'Classifica o impacto da legislação na licença e/ou marca o item como lido.',
  })
  @ApiOkResponse({ type: LicenseLegislationResponseDto })
  @ApiNotFoundResponse({ description: 'License or legislation not found.' })
  async updateLicenseLegislation(
    @Param('licenseId', uuidPipe) licenseId: string,
    @Param('id', uuidPipe) id: string,
    @Body() dto: UpdateLicenseLegislationDto,
    @CurrentUser() user: { id: string },
  ): Promise<LicenseLegislationResponseDto> {
    const link = await this.updateLicenseLegislationUseCase.execute({
      licenseId,
      id,
      ownerUserId: user.id,
      impact: dto.impact,
      read: dto.read,
    });

    return toLicenseLegislationResponse(link);
  }
}

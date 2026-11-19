import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
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
import { AddLicenseLegislationsUseCase } from '../application/add-license-legislations.use-case';
import { ListLicenseLegislationsUseCase } from '../application/list-license-legislations.use-case';
import { CreateLicenseLegislationsDto } from './dto/create-license-legislations.dto';
import { RemoveLicenseLegislationUseCase } from '../application/remove-license-legislation.use-case';
import { UpdateLicenseLegislationUseCase } from '../application/update-license-legislation.use-case';
import { AddLicenseLegislationDto } from './dto/add-license-legislation.dto';
import { toLegislationData } from './dto/legislation-input.dto';
import {
  LicenseLegislationResponseDto,
  toLicenseLegislationResponse,
} from './dto/license-legislation-response.dto';
import { ListLicenseLegislationsQueryDto } from './dto/list-license-legislations-query.dto';
import { UpdateLicenseLegislationDto } from './dto/update-license-legislation.dto';
import { LegislationsExceptionFilter } from './filters/legislations-exception.filter';
import { AddLicenseLegislationUseCase } from '../application/add-license-legislation.use-case';

const uuidPipe = new ParseUUIDPipe({
  exceptionFactory: invalidCustomerIdException,
});

@ApiTags('legislations')
@UseFilters(LicensesExceptionFilter, LegislationsExceptionFilter)
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiParam({ name: 'licenseId', format: 'uuid' })
@ApiNotFoundResponse({ description: 'License not found.' })
@Controller('licenses/:licenseId/legislations')
export class LicenseLegislationsController {
  constructor(
    private readonly listLicenseLegislationsUseCase: ListLicenseLegislationsUseCase,
    private readonly addLicenseLegislationUseCase: AddLicenseLegislationUseCase,
    private readonly addLicenseLegislationsUseCase: AddLicenseLegislationsUseCase,
    private readonly updateLicenseLegislationUseCase: UpdateLicenseLegislationUseCase,
    private readonly removeLicenseLegislationUseCase: RemoveLicenseLegislationUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'Lista o radar de legislação da licença, da legislação mais recente para a mais antiga. Aceita ?impact= para filtrar por nível de impacto.',
  })
  @ApiOkResponse({ type: LicenseLegislationResponseDto, isArray: true })
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

  @Post('batch')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiParam({ name: 'licenseId', format: 'uuid' })
  @ApiOperation({
    summary:
      'Adiciona várias legislações ao radar da licença. Legislações já vinculadas são ignoradas (idempotente) e devolvem o vínculo existente.',
  })
  @ApiCreatedResponse({ type: LicenseLegislationResponseDto, isArray: true })
  @ApiBadRequestResponse({
    description: 'Invalid body or legislation reference.',
  })
  @ApiNotFoundResponse({
    description: 'License or catalog legislation not found.',
  })
  async addLicenseLegislations(
    @Param('licenseId', uuidPipe) licenseId: string,
    @CurrentUser() user: { id: string },
    @Body() body: CreateLicenseLegislationsDto,
  ): Promise<LicenseLegislationResponseDto[]> {
    const links = await this.addLicenseLegislationsUseCase.execute(
      licenseId,
      user.id,
      body.toDomain(),
    );

    return links.map(toLicenseLegislationResponse);
  }

  @Post()
  @ApiOperation({
    summary:
      'Adiciona manualmente uma legislação ao radar da licença: uma lei do catálogo (legislation_id) ou os dados de uma lei, reaproveitada se já existir.',
  })
  @ApiCreatedResponse({ type: LicenseLegislationResponseDto })
  @ApiBadRequestResponse({
    description:
      'Invalid body, or neither/both legislation_id and legislation.',
  })
  @ApiConflictResponse({
    description: 'The legislation is already on the license radar.',
  })
  async addLicenseLegislation(
    @Param('licenseId', uuidPipe) licenseId: string,
    @Body() dto: AddLicenseLegislationDto,
    @CurrentUser() user: { id: string },
  ): Promise<LicenseLegislationResponseDto> {
    const link = await this.addLicenseLegislationUseCase.execute(
      licenseId,
      user.id,
      {
        legislationId: dto.legislation_id,
        legislation: dto.legislation && toLegislationData(dto.legislation),
        citedExcerpt: dto.cited_excerpt,
      },
    );

    return toLicenseLegislationResponse(link);
  }

  @Patch(':id')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOperation({
    summary:
      'Atualiza uma legislação no radar: classifica o impacto, marca como lido, registra a análise técnica, e/ou edita o trecho citado e os dados da lei.',
  })
  @ApiOkResponse({ type: LicenseLegislationResponseDto })
  @ApiConflictResponse({
    description:
      'The legislation is shared with other licenses, or the edited data matches a legislation already on the radar.',
  })
  async updateLicenseLegislation(
    @Param('licenseId', uuidPipe) licenseId: string,
    @Param('id', uuidPipe) id: string,
    @Body() dto: UpdateLicenseLegislationDto,
    @CurrentUser() user: { id: string },
  ): Promise<LicenseLegislationResponseDto> {
    const link = await this.updateLicenseLegislationUseCase.execute(
      licenseId,
      id,
      user.id,
      {
        citedExcerpt: dto.cited_excerpt,
        legislation: dto.legislation && toLegislationData(dto.legislation),
        impact: dto.impact,
        technicalAnalysis: dto.technical_analysis,
        read: dto.read,
      },
    );

    return toLicenseLegislationResponse(link);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOperation({
    summary:
      'Remove a legislação do radar da licença, sem apagá-la do catálogo nem das outras licenças.',
  })
  @ApiNoContentResponse()
  async removeLicenseLegislation(
    @Param('licenseId', uuidPipe) licenseId: string,
    @Param('id', uuidPipe) id: string,
    @CurrentUser() user: { id: string },
  ): Promise<void> {
    await this.removeLicenseLegislationUseCase.execute(licenseId, id, user.id);
  }
}

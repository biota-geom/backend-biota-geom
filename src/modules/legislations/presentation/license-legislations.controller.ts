import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
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
import {
  LicenseLegislationResponseDto,
  toLicenseLegislationResponse,
} from './dto/license-legislation-response.dto';

const uuidPipe = new ParseUUIDPipe({
  exceptionFactory: invalidCustomerIdException,
});

@ApiTags('legislations')
@UseFilters(LicensesExceptionFilter)
@Controller('licenses/:licenseId/legislations')
export class LicenseLegislationsController {
  constructor(
    private readonly listLicenseLegislationsUseCase: ListLicenseLegislationsUseCase,
    private readonly addLicenseLegislationsUseCase: AddLicenseLegislationsUseCase,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiParam({ name: 'licenseId', format: 'uuid' })
  @ApiOperation({
    summary:
      'Lista o radar de legislação da licença, da legislação mais recente para a mais antiga.',
  })
  @ApiOkResponse({ type: LicenseLegislationResponseDto, isArray: true })
  @ApiNotFoundResponse({ description: 'License not found.' })
  async listLicenseLegislations(
    @Param('licenseId', uuidPipe) licenseId: string,
    @CurrentUser() user: { id: string },
  ): Promise<LicenseLegislationResponseDto[]> {
    const links = await this.listLicenseLegislationsUseCase.execute(
      licenseId,
      user.id,
    );

    return links.map(toLicenseLegislationResponse);
  }

  @Post('batch')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiParam({ name: 'licenseId', format: 'uuid' })
  @ApiOperation({ summary: 'Adiciona várias legislações ao radar da licença.' })
  @ApiCreatedResponse({ type: LicenseLegislationResponseDto, isArray: true })
  @ApiNotFoundResponse({ description: 'License not found.' })
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
}

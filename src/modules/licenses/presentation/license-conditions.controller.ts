import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
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
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { AddLicenseConditionsUseCase } from '../application/add-license-conditions.use-case';
import { UpdateLicenseConditionUseCase } from '../application/update-license-conditions.use-case';
import { GetLicenseConditionsComplianceUseCase } from '../application/get-license-conditions-compliance.use-case';
import { ListLicenseConditionsByCustomerUseCase } from '../application/list-license-conditions-by-customer.use-case';
import { LicenseConditionRiskLevel } from '../domain/license-condition-risk-level';
import {
  AddLicenseConditionDto,
  toLicenseConditionStatus,
} from './dto/add-license-condition.dto';
import {
  LicenseConditionCreatedResponseDto,
  toLicenseConditionCreatedResponse,
} from './dto/license-condition-created-response.dto';
import { LicenseConditionListResponseDto } from './dto/license-condition-list-response.dto';
import { toLicenseConditionResponse } from './dto/license-condition-response.dto';
import {
  LicenseConditionsComplianceResponseDto,
  toLicenseConditionsComplianceResponse,
} from './dto/license-conditions-compliance-response.dto';
import {
  LicenseConditionStatusFilter,
  ListLicenseConditionsQueryDto,
} from './dto/list-license-conditions-query.dto';
import { LicensesExceptionFilter } from './filters/licenses-exception.filter';
import { invalidCustomerIdException } from './licenses.controller';
import { UpdateLicenseConditionDto } from './dto/update-license-condition.dto';
import {
  LicenseConditionDetailsResponseDto,
  toLicenseConditionDetailsResponse,
} from './dto/license-details-response.dto';

const uuidPipe = new ParseUUIDPipe({
  exceptionFactory: invalidCustomerIdException,
});

@ApiTags('license-conditions')
@UseFilters(LicensesExceptionFilter)
@Controller()
export class LicenseConditionsController {
  constructor(
    private readonly listLicenseConditionsByCustomerUseCase: ListLicenseConditionsByCustomerUseCase,
    private readonly addLicenseConditionsUseCase: AddLicenseConditionsUseCase,
    private readonly getLicenseConditionsComplianceUseCase: GetLicenseConditionsComplianceUseCase,
    private readonly updateLicenseConditionUseCase: UpdateLicenseConditionUseCase,
  ) {}

  @Get('customers/:customerId/license-conditions/compliance')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiParam({ name: 'customerId', format: 'uuid' })
  @ApiOperation({
    summary:
      'Retorna o percentual de conformidade geral das condicionantes da empresa.',
  })
  @ApiOkResponse({ type: LicenseConditionsComplianceResponseDto })
  async getLicenseConditionsCompliance(
    @Param('customerId', uuidPipe) customerId: string,
    @CurrentUser() user: { id: string },
  ): Promise<LicenseConditionsComplianceResponseDto> {
    const compliance = await this.getLicenseConditionsComplianceUseCase.execute(
      customerId,
      user.id,
    );

    return toLicenseConditionsComplianceResponse(compliance);
  }

  @Get('customers/:customerId/license-conditions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiParam({ name: 'customerId', format: 'uuid' })
  @ApiOperation({
    summary:
      'Lista as condicionantes ambientais da empresa ordenadas por nível de risco.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: LicenseConditionStatusFilter,
  })
  @ApiOkResponse({ type: LicenseConditionListResponseDto })
  async listLicenseConditions(
    @Param('customerId', uuidPipe) customerId: string,
    @CurrentUser() user: { id: string },
    @Query() query: ListLicenseConditionsQueryDto,
  ): Promise<LicenseConditionListResponseDto> {
    const conditions =
      await this.listLicenseConditionsByCustomerUseCase.execute(
        customerId,
        user.id,
        toRiskLevel(query.status),
      );

    return {
      total: conditions.total,
      data: conditions.data.map(toLicenseConditionResponse),
    };
  }

  @Post('licenses/:licenseId/conditions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiParam({ name: 'licenseId', format: 'uuid' })
  @ApiOperation({
    summary: 'Cadastra uma condicionante ambiental vinculada à licença.',
  })
  @ApiCreatedResponse({ type: LicenseConditionCreatedResponseDto })
  @ApiNotFoundResponse({
    description: 'Licença inexistente.',
  })
  async addLicenseCondition(
    @Param('licenseId', uuidPipe) licenseId: string,
    @Body() dto: AddLicenseConditionDto,
    @CurrentUser() user: { id: string },
  ): Promise<LicenseConditionCreatedResponseDto> {
    const [condition] = await this.addLicenseConditionsUseCase.execute({
      licenseId,
      ownerUserId: user.id,
      conditions: [
        {
          licenseId: dto.license_id,
          name: dto.name,
          environmentalDescriptor: dto.environmental_descriptor,
          responsibleAgency: dto.responsible_agency,
          dueDate: new Date(dto.due_date),
          status: toLicenseConditionStatus(dto.status),
          hasDelivery: dto.has_delivery,
          description: dto.description || undefined,
        },
      ],
    });

    return toLicenseConditionCreatedResponse(condition);
  }

  @Put('license-conditions/:conditionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiParam({ name: 'conditionId', format: 'uuid' })
  @ApiOkResponse({ type: LicenseConditionDetailsResponseDto })
  @ApiNotFoundResponse({ description: 'Condition not found.' })
  async updateLicenseCondition(
    @Param('conditionId', uuidPipe) conditionId: string,
    @Body() dto: UpdateLicenseConditionDto,
    @CurrentUser() user: { id: string },
  ): Promise<LicenseConditionDetailsResponseDto> {
    const condition = await this.updateLicenseConditionUseCase.executeForOwner(
      conditionId,
      user.id,
      {
        title: dto.name ?? dto.title,
        environmentalDescriptor: dto.environmental_descriptor,
        description: dto.description,
        responsibleAgency: dto.responsible_agency,
        dueDate:
          dto.due_date === undefined ? undefined : new Date(dto.due_date),
        hasDelivery: dto.has_delivery,
        isViolated: dto.is_violated,
      },
    );

    return toLicenseConditionDetailsResponse(condition);
  }
}

function toRiskLevel(status?: LicenseConditionStatusFilter) {
  switch (status) {
    case LicenseConditionStatusFilter.REGULAR:
      return LicenseConditionRiskLevel.REGULAR;
    case LicenseConditionStatusFilter.ATTENTION:
      return LicenseConditionRiskLevel.ATTENTION;
    case LicenseConditionStatusFilter.RISK:
      return LicenseConditionRiskLevel.RISK;
    default:
      return undefined;
  }
}

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
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { AddLicenseConditionsUseCase } from '../application/add-license-conditions.use-case';
import { ListLicenseConditionsByCustomerUseCase } from '../application/list-license-conditions-by-customer.use-case';
import {
  AddLicenseConditionDto,
  toLicenseConditionStatus,
} from './dto/add-license-condition.dto';
import {
  LicenseConditionCreatedResponseDto,
  toLicenseConditionCreatedResponse,
} from './dto/license-condition-created-response.dto';
import {
  LicenseConditionResponseDto,
  toLicenseConditionResponse,
} from './dto/license-condition-response.dto';
import { LicensesExceptionFilter } from './filters/licenses-exception.filter';
import { invalidCustomerIdException } from './licenses.controller';

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
  ) {}

  @Get('customers/:customerId/license-conditions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiParam({ name: 'customerId', format: 'uuid' })
  @ApiOperation({
    summary:
      'Lista as condicionantes ambientais da empresa ordenadas por nível de risco.',
  })
  @ApiOkResponse({ type: LicenseConditionResponseDto, isArray: true })
  async listLicenseConditions(
    @Param('customerId', uuidPipe) customerId: string,
    @CurrentUser() user: { id: string },
  ): Promise<LicenseConditionResponseDto[]> {
    const conditions =
      await this.listLicenseConditionsByCustomerUseCase.execute(
        customerId,
        user.id,
      );

    return conditions.map(toLicenseConditionResponse);
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
    description: 'Licença ou parâmetro GRI inexistente.',
  })
  @ApiUnprocessableEntityResponse({
    description: 'Parâmetro GRI não vinculado à empresa da licença.',
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
          esgMetricId: dto.esg_metric_id,
          responsibleAgency: dto.responsible_agency,
          dueDate: new Date(dto.due_date),
          status: toLicenseConditionStatus(dto.status),
          description: dto.description || undefined,
        },
      ],
    });

    return toLicenseConditionCreatedResponse(condition);
  }
}

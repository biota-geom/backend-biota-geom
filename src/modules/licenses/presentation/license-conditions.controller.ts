import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Put,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { DeleteLicenseConditionUseCase } from '../application/delete-license-condition.use-case';
import { ListLicenseConditionsByCustomerUseCase } from '../application/list-license-conditions-by-customer.use-case';
import { UpdateLicenseConditionUseCase } from '../application/update-license-condition.use-case';
import {
  LicenseConditionResponseDto,
  toLicenseConditionResponse,
} from './dto/license-condition-response.dto';
import { UpdateLicenseConditionDto } from './dto/update-license-condition.dto';
import { LicensesExceptionFilter } from './filters/licenses-exception.filter';
import { invalidCustomerIdException } from './licenses.controller';

const uuidPipe = new ParseUUIDPipe({
  exceptionFactory: invalidCustomerIdException,
});

@ApiTags('license-conditions')
@UseFilters(LicensesExceptionFilter)
@Controller('customers/:customerId/license-conditions')
export class LicenseConditionsController {
  constructor(
    private readonly listLicenseConditionsByCustomerUseCase: ListLicenseConditionsByCustomerUseCase,
    private readonly updateLicenseConditionUseCase: UpdateLicenseConditionUseCase,
    private readonly deleteLicenseConditionUseCase: DeleteLicenseConditionUseCase,
  ) {}

  @Get()
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

  @Put(':conditionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiParam({ name: 'customerId', format: 'uuid' })
  @ApiParam({ name: 'conditionId', format: 'uuid' })
  @ApiOperation({
    summary: 'Atualiza uma condicionante ambiental da empresa.',
  })
  @ApiOkResponse({ type: LicenseConditionResponseDto })
  async updateLicenseCondition(
    @Param('customerId', uuidPipe) customerId: string,
    @Param('conditionId', uuidPipe) conditionId: string,
    @Body() body: UpdateLicenseConditionDto,
    @CurrentUser() user: { id: string },
  ): Promise<LicenseConditionResponseDto> {
    const condition = await this.updateLicenseConditionUseCase.execute(
      conditionId,
      customerId,
      user.id,
      {
        licenseId: body.license_id,
        title: body.title,
        description: body.description,
        category: body.category,
        dueDate: new Date(body.due_date),
      },
    );

    return toLicenseConditionResponse(condition);
  }

  @Delete(':conditionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiParam({ name: 'customerId', format: 'uuid' })
  @ApiParam({ name: 'conditionId', format: 'uuid' })
  @ApiOperation({
    summary: 'Remove uma condicionante ambiental da empresa.',
  })
  @ApiNoContentResponse({ description: 'Condicionante removida.' })
  async deleteLicenseCondition(
    @Param('customerId', uuidPipe) customerId: string,
    @Param('conditionId', uuidPipe) conditionId: string,
    @CurrentUser() user: { id: string },
  ): Promise<void> {
    await this.deleteLicenseConditionUseCase.execute(
      conditionId,
      customerId,
      user.id,
    );
  }
}

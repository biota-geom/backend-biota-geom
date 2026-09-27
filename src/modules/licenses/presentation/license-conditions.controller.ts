import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { ListLicenseConditionsByCustomerUseCase } from '../application/list-license-conditions-by-customer.use-case';
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
@Controller('customers/:customerId/license-conditions')
export class LicenseConditionsController {
  constructor(
    private readonly listLicenseConditionsByCustomerUseCase: ListLicenseConditionsByCustomerUseCase,
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
}

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
}

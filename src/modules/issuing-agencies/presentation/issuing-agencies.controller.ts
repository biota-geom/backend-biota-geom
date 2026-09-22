import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { ListIssuingAgenciesUseCase } from '../application/list-issuing-agencies.use-case';
import {
  IssuingAgencyResponseDTO,
  toIssuingAgencyResponse,
} from './dto/issuing-agency-response.dto';

@ApiTags('issuing-agencies')
@ApiBearerAuth()
@Controller('issuing-agencies')
export class IssuingAgenciesController {
  constructor(
    private readonly listIssuingAgenciesUseCase: ListIssuingAgenciesUseCase,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary:
      'Lista os órgãos emissores disponíveis para vincular a uma licença.',
  })
  @ApiOkResponse({ type: IssuingAgencyResponseDTO, isArray: true })
  async listIssuingAgencies(): Promise<IssuingAgencyResponseDTO[]> {
    const agencies =
      await this.listIssuingAgenciesUseCase.listIssuingAgencies();

    return agencies.map(toIssuingAgencyResponse);
  }
}

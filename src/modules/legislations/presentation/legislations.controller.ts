import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { SearchLegislationsUseCase } from '../application/search-legislations.use-case';
import {
  SearchLegislationsQueryDto,
  SearchLegislationsResponseDto,
} from './dto/license-legislation-response.dto';

@ApiTags('legislations')
@Controller('legislations')
export class LegislationsController {
  constructor(
    private readonly searchLegislationsUseCase: SearchLegislationsUseCase,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Busca legislações do catálogo por número, ano ou ementa.',
  })
  @ApiOkResponse({ type: SearchLegislationsResponseDto })
  async searchLegislations(
    @Query() query: SearchLegislationsQueryDto,
  ): Promise<SearchLegislationsResponseDto> {
    const legislations = await this.searchLegislationsUseCase.execute(
      query.search,
    );

    return { legislations };
  }
}

import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { ListSectorsUseCase } from '../application/list-sectors.use-case';
import { SectorResponseDTO, toSectorResponse } from './dto/sector-response.dto';

@ApiTags('sectors')
@ApiBearerAuth()
@Controller('sectors')
export class SectorsController {
  constructor(private readonly listSectorsUseCase: ListSectorsUseCase) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Lista os segmentos disponíveis para vincular a uma empresa.',
  })
  @ApiOkResponse({ type: SectorResponseDTO, isArray: true })
  async listSectors(): Promise<SectorResponseDTO[]> {
    const sectors = await this.listSectorsUseCase.listSectors();

    return sectors.map(toSectorResponse);
  }
}

import { Injectable } from '@nestjs/common';
import { SectorRepository } from '../domain/sectors.repository';
import { Sector } from '../domain/sector.entity';

@Injectable()
export class ListSectorsUseCase {
  constructor(private readonly repository: SectorRepository) {}

  async listSectors(): Promise<Sector[]> {
    return this.repository.findAll();
  }
}

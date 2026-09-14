import { Injectable } from '@nestjs/common';
import { Sector } from './sector.entity';

@Injectable()
export abstract class SectorRepository {
  abstract findAll(): Promise<Sector[]>;

  abstract existsById(id: string): Promise<boolean>;
}

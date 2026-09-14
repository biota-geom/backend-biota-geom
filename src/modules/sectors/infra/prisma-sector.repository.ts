import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Sector } from '../domain/sector.entity';
import { SectorRepository } from '../domain/sectors.repository';

@Injectable()
export class PrismaSectorRepository implements SectorRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Sector[]> {
    return this.prisma.sector.findMany({ orderBy: { name: 'asc' } });
  }

  async existsById(id: string): Promise<boolean> {
    const sector = await this.prisma.sector.findUnique({
      where: { id },
      select: { id: true },
    });

    return sector !== null;
  }
}

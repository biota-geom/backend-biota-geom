import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IssuingAgency } from '../domain/issuing-agency.entity';
import { IssuingAgencyRepository } from '../domain/issuing-agencies.repository';

@Injectable()
export class PrismaIssuingAgencyRepository implements IssuingAgencyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<IssuingAgency[]> {
    return this.prisma.issuingAgency.findMany({ orderBy: { name: 'asc' } });
  }

  async existsById(id: string): Promise<boolean> {
    const agency = await this.prisma.issuingAgency.findUnique({
      where: { id },
      select: { id: true },
    });

    return agency !== null;
  }
}

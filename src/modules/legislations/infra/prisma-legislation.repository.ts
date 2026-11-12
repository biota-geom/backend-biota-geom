import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateLegislationData,
  LegislationIdentity,
} from '../domain/legislation.data';
import { Legislation } from '../domain/legislation.entity';
import { LegislationRepository } from '../domain/legislations.repository';

@Injectable()
export class PrismaLegislationRepository implements LegislationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Legislation | null> {
    return this.prisma.legislation.findUnique({ where: { id } });
  }

  async findByIdentity({
    type,
    number,
    year,
    issuingBody,
  }: LegislationIdentity): Promise<Legislation | null> {
    return this.prisma.legislation.findUnique({
      where: {
        type_number_year_issuingBody: { type, number, year, issuingBody },
      },
    });
  }

  // `update: {}` keeps whatever the catalog already holds: a scan or a manual
  // entry citing an act must never overwrite its curated summary.
  async findOrCreate(data: CreateLegislationData): Promise<Legislation> {
    const { type, number, year, issuingBody } = data;

    return this.prisma.legislation.upsert({
      where: {
        type_number_year_issuingBody: { type, number, year, issuingBody },
      },
      create: data,
      update: {},
    });
  }

  async findAllBySearch(search: string): Promise<Legislation[]> {
    const term = search.trim();
    const yearNumber = Number(term);
    const isYear = term !== '' && Number.isInteger(yearNumber);

    return this.prisma.legislation.findMany({
      where: {
        OR: [
          { number: { contains: term, mode: 'insensitive' } },
          { summary: { contains: term, mode: 'insensitive' } },
          ...(isYear ? [{ year: { equals: yearNumber } }] : []),
        ],
      },
      take: 10,
    });
  }
}

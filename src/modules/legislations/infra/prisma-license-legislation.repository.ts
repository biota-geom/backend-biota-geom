import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateLicenseLegislationData,
  ListLicenseLegislationsFilter,
  UpdateLicenseLegislationData,
} from '../domain/legislation.data';
import { LegislationAlreadyLinkedError } from '../domain/errors/legislation-already-linked.error';
import { LicenseLegislation } from '../domain/license-legislation.entity';
import { LicenseLegislationRepository } from '../domain/license-legislations.repository';

const WITH_LEGISLATION = { legislation: true } as const;
const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === UNIQUE_CONSTRAINT_VIOLATION
  );
}

@Injectable()
export class PrismaLicenseLegislationRepository implements LicenseLegislationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByLicenseId(
    licenseId: string,
    filter: ListLicenseLegislationsFilter = {},
  ): Promise<LicenseLegislation[]> {
    return this.prisma.licenseLegislation.findMany({
      where: {
        licenseId,
        ...(filter.impact ? { impact: filter.impact } : {}),
      },
      include: WITH_LEGISLATION,
      orderBy: [
        { legislation: { year: 'desc' } },
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
    });
  }

  async findByIdForLicense(
    id: string,
    licenseId: string,
  ): Promise<LicenseLegislation | null> {
    return this.prisma.licenseLegislation.findFirst({
      where: { id, licenseId },
      include: WITH_LEGISLATION,
    });
  }

  async findByLicenseAndLegislation(
    licenseId: string,
    legislationId: string,
  ): Promise<LicenseLegislation | null> {
    return this.prisma.licenseLegislation.findUnique({
      where: { licenseId_legislationId: { licenseId, legislationId } },
      include: WITH_LEGISLATION,
    });
  }

  async countByLegislationId(legislationId: string): Promise<number> {
    return this.prisma.licenseLegislation.count({ where: { legislationId } });
  }

  // The (license, legislation) unique index is the last word on duplicates:
  // two concurrent requests linking the same act both pass the use case check.
  async create(
    data: CreateLicenseLegislationData,
  ): Promise<LicenseLegislation> {
    try {
      return await this.prisma.licenseLegislation.create({
        data,
        include: WITH_LEGISLATION,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new LegislationAlreadyLinkedError(data.legislationId);
      }
      throw error;
    }
  }

  async createMany(
    data: CreateLicenseLegislationData[],
  ): Promise<LicenseLegislation[]> {
    const dataByLegislationId = new Map<string, CreateLicenseLegislationData>();
    for (const item of data) {
      if (!dataByLegislationId.has(item.legislationId)) {
        dataByLegislationId.set(item.legislationId, item);
      }
    }
    const uniqueData = [...dataByLegislationId.values()];
    if (uniqueData.length === 0) return [];

    const licenseId = uniqueData[0].licenseId;
    await this.prisma.licenseLegislation.createMany({
      data: uniqueData,
      skipDuplicates: true,
    });

    const links = await this.prisma.licenseLegislation.findMany({
      where: {
        licenseId,
        legislationId: {
          in: uniqueData.map((item) => item.legislationId),
        },
      },
      include: WITH_LEGISLATION,
    });
    const linkByLegislationId = new Map(
      links.map((link) => [link.legislationId, link]),
    );

    return uniqueData.flatMap((item) => {
      const link = linkByLegislationId.get(item.legislationId);
      return link ? [link] : [];
    });
  }

  async update(
    id: string,
    data: UpdateLicenseLegislationData,
  ): Promise<LicenseLegislation> {
    try {
      return await this.prisma.licenseLegislation.update({
        where: { id },
        data,
        include: WITH_LEGISLATION,
      });
    } catch (error) {
      if (isUniqueViolation(error) && data.legislationId) {
        throw new LegislationAlreadyLinkedError(data.legislationId);
      }
      throw error;
    }
  }

  async markAsReadIfUnread(
    id: string,
    readAt: Date,
  ): Promise<LicenseLegislation> {
    await this.prisma.licenseLegislation.updateMany({
      where: { id, readAt: null },
      data: { readAt },
    });

    return this.prisma.licenseLegislation.findUniqueOrThrow({
      where: { id },
      include: WITH_LEGISLATION,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.licenseLegislation.delete({ where: { id } });
  }
}

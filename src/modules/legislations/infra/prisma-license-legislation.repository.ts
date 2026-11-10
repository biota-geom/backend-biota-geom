import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateLicenseLegislationData,
  UpdateLicenseLegislationData,
} from '../domain/legislation.data';
import { LicenseLegislation } from '../domain/license-legislation.entity';
import { LicenseLegislationRepository } from '../domain/license-legislations.repository';

const WITH_LEGISLATION = { legislation: true } as const;

@Injectable()
export class PrismaLicenseLegislationRepository implements LicenseLegislationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByLicenseId(licenseId: string): Promise<LicenseLegislation[]> {
    return this.prisma.licenseLegislation.findMany({
      where: { licenseId },
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

  async create(
    data: CreateLicenseLegislationData,
  ): Promise<LicenseLegislation> {
    return this.prisma.licenseLegislation.create({
      data,
      include: WITH_LEGISLATION,
    });
  }

  async update(
    id: string,
    data: UpdateLicenseLegislationData,
  ): Promise<LicenseLegislation> {
    return this.prisma.licenseLegislation.update({
      where: { id },
      data,
      include: WITH_LEGISLATION,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.licenseLegislation.delete({ where: { id } });
  }
}

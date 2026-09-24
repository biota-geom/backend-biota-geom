import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateLicenseData } from '../domain/create-license.data';
import { License } from '../domain/license.entity';
import { LicenseRepository } from '../domain/licenses.repository';

@Injectable()
export class PrismaLicenseRepository implements LicenseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateLicenseData): Promise<License> {
    return this.prisma.license.create({
      data: {
        customer: { connect: { id: data.customerId } },
        type: data.type,
        processNumber: data.processNumber,
        issuingAgency: { connect: { id: data.issuingAgencyId } },
        issueDate: data.issueDate,
        expirationDate: data.expirationDate,
        status: data.status,
        documentUrl: data.documentUrl,
      },
      include: {
        issuingAgency: true,
      },
    });
  }

  async findAllByCustomerId(customerId: string): Promise<License[]> {
    return this.prisma.license.findMany({
      where: { customerId },
      include: { issuingAgency: true },
      orderBy: { expirationDate: 'asc' },
    });
  }
}

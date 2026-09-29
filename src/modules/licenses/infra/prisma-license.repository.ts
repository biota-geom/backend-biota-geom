import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateLicenseData } from '../domain/create-license.data';
import { License } from '../domain/license.entity';
import {
  ATTENDED_LICENSE_CONDITION_STATUSES,
  LicenseWithConditionsSummary,
} from '../domain/license-conditions-summary';
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

  async findById(id: string): Promise<License | null> {
    return this.prisma.license.findUnique({
      where: { id },
      include: { issuingAgency: true },
    });
  }

  async findAllByCustomerId(
    customerId: string,
  ): Promise<LicenseWithConditionsSummary[]> {
    const licenses = await this.prisma.license.findMany({
      where: { customerId },
      include: {
        issuingAgency: true,
        _count: { select: { conditions: true } },
        // Only the attended ones are loaded, and only their ids: the list
        // itself is discarded, its length is the attended count.
        conditions: {
          where: { status: { in: [...ATTENDED_LICENSE_CONDITION_STATUSES] } },
          select: { id: true },
        },
      },
      orderBy: { expirationDate: 'asc' },
    });

    return licenses.map(({ _count, conditions, ...license }) => ({
      ...license,
      conditionsSummary: {
        total: _count.conditions,
        attended: conditions.length,
      },
    }));
  }
}

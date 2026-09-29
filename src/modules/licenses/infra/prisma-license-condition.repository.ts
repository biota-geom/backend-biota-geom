import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { LicenseCondition } from '../domain/license-condition.entity';
import { LicenseConditionRepository } from '../domain/license-conditions.repository';

@Injectable()
export class PrismaLicenseConditionRepository implements LicenseConditionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByCustomerId(customerId: string): Promise<LicenseCondition[]> {
    return this.prisma.licenseCondition.findMany({
      where: { license: { customerId } },
      orderBy: { dueDate: 'asc' },
    });
  }
}

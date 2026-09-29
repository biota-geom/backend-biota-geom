import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AddLicenseConditionData } from '../domain/add-license-condition.data';
import { LicenseCondition } from '../domain/license-condition.entity';
import { LicenseConditionRepository } from '../domain/license-conditions.repository';

@Injectable()
export class PrismaLicenseConditionRepository implements LicenseConditionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async addMany(
    conditions: AddLicenseConditionData[],
  ): Promise<LicenseCondition[]> {
    return this.prisma.$transaction(
      conditions.map((condition) =>
        this.prisma.licenseCondition.create({ data: condition }),
      ),
    );
  }

  async findAllByCustomerId(customerId: string): Promise<LicenseCondition[]> {
    return this.prisma.licenseCondition.findMany({
      where: { license: { customerId } },
      orderBy: { dueDate: 'asc' },
    });
  }
}

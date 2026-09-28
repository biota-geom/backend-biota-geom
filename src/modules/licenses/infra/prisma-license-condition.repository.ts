import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { LicenseCondition } from '../domain/license-condition.entity';
import { LicenseConditionRepository } from '../domain/license-conditions.repository';
import { UpdateLicenseConditionData } from '../domain/update-license-condition.data';

@Injectable()
export class PrismaLicenseConditionRepository implements LicenseConditionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByCustomerId(customerId: string): Promise<LicenseCondition[]> {
    return this.prisma.licenseCondition.findMany({
      where: { license: { customerId } },
      orderBy: { dueDate: 'asc' },
    });
  }

  /*
   * updateMany, not update, so the owning customer is part of the WHERE
   * clause: a condition from another company matches no row and comes back
   * as null instead of being written to. The follow-up read returns the
   * persisted row (with the refreshed updatedAt) to the caller.
   */
  async update(
    conditionId: string,
    customerId: string,
    data: UpdateLicenseConditionData,
  ): Promise<LicenseCondition | null> {
    const { count } = await this.prisma.licenseCondition.updateMany({
      where: { id: conditionId, license: { customerId } },
      data: {
        licenseId: data.licenseId,
        title: data.title,
        description: data.description,
        category: data.category,
        dueDate: data.dueDate,
      },
    });

    if (count === 0) {
      return null;
    }

    return this.prisma.licenseCondition.findUnique({
      where: { id: conditionId },
    });
  }

  async remove(conditionId: string, customerId: string): Promise<boolean> {
    const { count } = await this.prisma.licenseCondition.deleteMany({
      where: { id: conditionId, license: { customerId } },
    });

    return count > 0;
  }
}

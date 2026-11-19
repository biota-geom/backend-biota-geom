import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AlertSyncScope } from '../domain/alert-generator';
import { LicenseExpirationSource } from '../domain/license-expiration-source';

@Injectable()
export class PrismaLicenseExpirationSource implements LicenseExpirationSource {
  constructor(private readonly prisma: PrismaService) {}

  list(scope: AlertSyncScope) {
    return this.prisma.license.findMany({
      where: {
        customer: { isDeleted: false, ownerUserId: scope.ownerUserId },
      },
      select: {
        id: true,
        customerId: true,
        status: true,
        expirationDate: true,
      },
    });
  }
}

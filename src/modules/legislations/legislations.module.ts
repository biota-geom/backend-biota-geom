import { Module } from '@nestjs/common';
import { LegislationRepository } from './domain/legislations.repository';
import { LicenseLegislationRepository } from './domain/license-legislations.repository';
import { PrismaLegislationRepository } from './infra/prisma-legislation.repository';
import { PrismaLicenseLegislationRepository } from './infra/prisma-license-legislation.repository';

// Data layer of the license radar. It exposes no routes: the radar use cases
// and controllers are added by the tasks that build on it.
@Module({
  providers: [
    { provide: LegislationRepository, useClass: PrismaLegislationRepository },
    {
      provide: LicenseLegislationRepository,
      useClass: PrismaLicenseLegislationRepository,
    },
  ],
  exports: [LegislationRepository, LicenseLegislationRepository],
})
export class LegislationsModule {}

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LicensesModule } from '../licenses/licenses.module';
import { AddLicenseLegislationUseCase } from './application/add-license-legislation.use-case';
import { ListLicenseLegislationsUseCase } from './application/list-license-legislations.use-case';
import { RemoveLicenseLegislationUseCase } from './application/remove-license-legislation.use-case';
import { UpdateLicenseLegislationUseCase } from './application/update-license-legislation.use-case';
import { LegislationRepository } from './domain/legislations.repository';
import { LicenseLegislationRepository } from './domain/license-legislations.repository';
import { PrismaLegislationRepository } from './infra/prisma-legislation.repository';
import { PrismaLicenseLegislationRepository } from './infra/prisma-license-legislation.repository';
import { LicenseLegislationsController } from './presentation/license-legislations.controller';

// License radar: the legislations each license cites. LicensesModule provides
// the license ownership check every radar route runs first.
@Module({
  imports: [AuthModule, LicensesModule],
  controllers: [LicenseLegislationsController],
  providers: [
    { provide: LegislationRepository, useClass: PrismaLegislationRepository },
    {
      provide: LicenseLegislationRepository,
      useClass: PrismaLicenseLegislationRepository,
    },
    ListLicenseLegislationsUseCase,
    AddLicenseLegislationUseCase,
    UpdateLicenseLegislationUseCase,
    RemoveLicenseLegislationUseCase,
  ],
  exports: [LegislationRepository, LicenseLegislationRepository],
})
export class LegislationsModule {}

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LicensesModule } from '../licenses/licenses.module';
import { ListLicenseLegislationsUseCase } from './application/list-license-legislations.use-case';
import { SearchLegislationsUseCase } from './application/search-legislations.use-case';
import { LegislationRepository } from './domain/legislations.repository';
import { LicenseLegislationRepository } from './domain/license-legislations.repository';
import { PrismaLegislationRepository } from './infra/prisma-legislation.repository';
import { PrismaLicenseLegislationRepository } from './infra/prisma-license-legislation.repository';
import { LegislationsController } from './presentation/legislations.controller';
import { LicenseLegislationsController } from './presentation/license-legislations.controller';

// License radar: the legislations each license cites. LicensesModule provides
// the license ownership check every radar route runs first.
@Module({
  imports: [AuthModule, LicensesModule],
  controllers: [LicenseLegislationsController, LegislationsController],
  providers: [
    { provide: LegislationRepository, useClass: PrismaLegislationRepository },
    {
      provide: LicenseLegislationRepository,
      useClass: PrismaLicenseLegislationRepository,
    },
    ListLicenseLegislationsUseCase,
    SearchLegislationsUseCase,
  ],
  exports: [LegislationRepository, LicenseLegislationRepository],
})
export class LegislationsModule {}

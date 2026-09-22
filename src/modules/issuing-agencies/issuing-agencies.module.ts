import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ListIssuingAgenciesUseCase } from './application/list-issuing-agencies.use-case';
import { IssuingAgencyRepository } from './domain/issuing-agencies.repository';
import { PrismaIssuingAgencyRepository } from './infra/prisma-issuing-agency.repository';
import { IssuingAgenciesController } from './presentation/issuing-agencies.controller';

@Module({
  imports: [AuthModule],
  controllers: [IssuingAgenciesController],
  providers: [
    {
      provide: IssuingAgencyRepository,
      useClass: PrismaIssuingAgencyRepository,
    },
    ListIssuingAgenciesUseCase,
  ],
  exports: [IssuingAgencyRepository],
})
export class IssuingAgenciesModule {}

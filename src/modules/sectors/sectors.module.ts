import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ListSectorsUseCase } from './application/list-sectors.use-case';
import { SectorRepository } from './domain/sectors.repository';
import { PrismaSectorRepository } from './infra/prisma-sector.repository';
import { SectorsController } from './presentation/sectors.controller';

@Module({
  imports: [AuthModule],
  controllers: [SectorsController],
  providers: [
    { provide: SectorRepository, useClass: PrismaSectorRepository },
    ListSectorsUseCase,
  ],
  exports: [SectorRepository],
})
export class SectorsModule {}

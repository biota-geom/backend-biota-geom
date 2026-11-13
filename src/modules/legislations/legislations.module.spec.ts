import { ListLicenseLegislationsUseCase } from './application/list-license-legislations.use-case';
import { UpdateLicenseLegislationUseCase } from './application/update-license-legislation.use-case';
import { LegislationRepository } from './domain/legislations.repository';
import { LicenseLegislationRepository } from './domain/license-legislations.repository';
import { LegislationsModule } from './legislations.module';
import { LicenseLegislationsController } from './presentation/license-legislations.controller';

describe('LegislationsModule', () => {
  it('exposes the repositories and the radar routes', () => {
    expect(Reflect.getMetadata('exports', LegislationsModule)).toEqual([
      LegislationRepository,
      LicenseLegislationRepository,
    ]);
    expect(Reflect.getMetadata('controllers', LegislationsModule)).toEqual([
      LicenseLegislationsController,
    ]);
    const providers = Reflect.getMetadata(
      'providers',
      LegislationsModule,
    ) as unknown[];
    expect(providers).toContain(ListLicenseLegislationsUseCase);
    expect(providers).toContain(UpdateLicenseLegislationUseCase);
  });
});

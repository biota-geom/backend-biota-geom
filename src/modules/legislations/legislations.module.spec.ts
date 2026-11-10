import { ListLicenseLegislationsUseCase } from './application/list-license-legislations.use-case';
import { LegislationRepository } from './domain/legislations.repository';
import { LicenseLegislationRepository } from './domain/license-legislations.repository';
import { LegislationsModule } from './legislations.module';
import { LicenseLegislationsController } from './presentation/license-legislations.controller';

describe('LegislationsModule', () => {
  it('exposes the repositories and the radar route', () => {
    expect(Reflect.getMetadata('exports', LegislationsModule)).toEqual([
      LegislationRepository,
      LicenseLegislationRepository,
    ]);
    expect(Reflect.getMetadata('controllers', LegislationsModule)).toEqual([
      LicenseLegislationsController,
    ]);
    expect(Reflect.getMetadata('providers', LegislationsModule)).toContain(
      ListLicenseLegislationsUseCase,
    );
  });
});

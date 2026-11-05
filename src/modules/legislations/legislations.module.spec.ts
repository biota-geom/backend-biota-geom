import { LegislationRepository } from './domain/legislations.repository';
import { LicenseLegislationRepository } from './domain/license-legislations.repository';
import { LegislationsModule } from './legislations.module';

describe('LegislationsModule', () => {
  it('exposes the repositories and no routes', () => {
    expect(Reflect.getMetadata('exports', LegislationsModule)).toEqual([
      LegislationRepository,
      LicenseLegislationRepository,
    ]);
    expect(
      Reflect.getMetadata('controllers', LegislationsModule),
    ).toBeUndefined();
  });
});

import { Injectable } from '@nestjs/common';
import { LicenseNotFoundError } from '../../licenses/domain/errors/license-not-found.error';
import { LicenseRepository } from '../../licenses/domain/licenses.repository';
import { LicenseLegislationNotFoundError } from '../domain/errors/license-legislation-not-found.error';
import { LicenseLegislationRepository } from '../domain/license-legislations.repository';

@Injectable()
export class RemoveLicenseLegislationUseCase {
  constructor(
    private readonly licenseRepository: LicenseRepository,
    private readonly licenseLegislationRepository: LicenseLegislationRepository,
  ) {}

  /*
   * Takes an act off the radar of one license. Only the link goes: the act
   * stays in the catalog and on every other license that cites it.
   */
  async execute(
    licenseId: string,
    licenseLegislationId: string,
    ownerUserId: string,
  ): Promise<void> {
    const license = await this.licenseRepository.findByIdForOwner(
      licenseId,
      ownerUserId,
    );
    if (!license) throw new LicenseNotFoundError(licenseId);

    const link = await this.licenseLegislationRepository.findByIdForLicense(
      licenseLegislationId,
      license.id,
    );
    if (!link) throw new LicenseLegislationNotFoundError(licenseLegislationId);

    await this.licenseLegislationRepository.delete(link.id);
  }
}

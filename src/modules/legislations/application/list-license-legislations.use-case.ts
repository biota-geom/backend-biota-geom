import { Injectable } from '@nestjs/common';
import { LicenseNotFoundError } from '../../licenses/domain/errors/license-not-found.error';
import { LicenseRepository } from '../../licenses/domain/licenses.repository';
import { LicenseLegislation } from '../domain/license-legislation.entity';
import { LicenseLegislationRepository } from '../domain/license-legislations.repository';

@Injectable()
export class ListLicenseLegislationsUseCase {
  constructor(
    private readonly licenseRepository: LicenseRepository,
    private readonly licenseLegislationRepository: LicenseLegislationRepository,
  ) {}

  /*
   * Lists the radar of a license owned by the caller. An unknown license and
   * one owned by someone else raise the same error, so both answer 404.
   */
  async execute(
    licenseId: string,
    ownerUserId: string,
  ): Promise<LicenseLegislation[]> {
    const license = await this.licenseRepository.findByIdForOwner(
      licenseId,
      ownerUserId,
    );
    if (!license) throw new LicenseNotFoundError(licenseId);

    return this.licenseLegislationRepository.findAllByLicenseId(license.id);
  }
}

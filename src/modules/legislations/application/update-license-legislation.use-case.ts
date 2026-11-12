import { Injectable } from '@nestjs/common';
import { LegislationImpact } from '@prisma/client';
import { LicenseNotFoundError } from '../../licenses/domain/errors/license-not-found.error';
import { LicenseRepository } from '../../licenses/domain/licenses.repository';
import { LicenseLegislationNotFoundError } from '../domain/errors/license-legislation-not-found.error';
import { UpdateLicenseLegislationData } from '../domain/legislation.data';
import { LicenseLegislation } from '../domain/license-legislation.entity';
import { LicenseLegislationRepository } from '../domain/license-legislations.repository';

export interface UpdateLicenseLegislationInput {
  licenseId: string;
  id: string;
  ownerUserId: string;
  /** undefined = leave as is, null = clear the classification. */
  impact?: LegislationImpact | null;
  /** true = mark as read (kept if it was already read). */
  read?: boolean;
}

@Injectable()
export class UpdateLicenseLegislationUseCase {
  constructor(
    private readonly licenseRepository: LicenseRepository,
    private readonly licenseLegislationRepository: LicenseLegislationRepository,
  ) {}

  /*
   * Classifies the impact of a legislation on the license and/or marks it as
   * read. An unknown license and one owned by someone else raise the same
   * error, so both answer 404.
   */
  async execute(
    input: UpdateLicenseLegislationInput,
  ): Promise<LicenseLegislation> {
    const { licenseId, id, ownerUserId } = input;

    const license = await this.licenseRepository.findByIdForOwner(
      licenseId,
      ownerUserId,
    );
    if (!license) throw new LicenseNotFoundError(licenseId);

    const current = await this.licenseLegislationRepository.findByIdForLicense(
      id,
      license.id,
    );
    if (!current) throw new LicenseLegislationNotFoundError(id, license.id);

    const data: UpdateLicenseLegislationData = {};
    if (input.impact !== undefined) data.impact = input.impact;
    if (input.read === true && current.readAt === null) {
      data.readAt = new Date();
    }

    if (Object.keys(data).length === 0) return current;

    return this.licenseLegislationRepository.update(id, data);
  }
}

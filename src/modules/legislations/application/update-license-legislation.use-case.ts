import { Injectable } from '@nestjs/common';
import { LicenseNotFoundError } from '../../licenses/domain/errors/license-not-found.error';
import { LicenseRepository } from '../../licenses/domain/licenses.repository';
import { LegislationAlreadyLinkedError } from '../domain/errors/legislation-already-linked.error';
import { LicenseLegislationNotFoundError } from '../domain/errors/license-legislation-not-found.error';
import { SharedLegislationNotEditableError } from '../domain/errors/shared-legislation-not-editable.error';
import {
  CreateLegislationData,
  UpdateLicenseLegislationData,
} from '../domain/legislation.data';
import { Legislation } from '../domain/legislation.entity';
import { LegislationRepository } from '../domain/legislations.repository';
import { LicenseLegislation } from '../domain/license-legislation.entity';
import { LicenseLegislationRepository } from '../domain/license-legislations.repository';

export interface UpdateLicenseLegislationInput {
  citedExcerpt?: string | null;
  legislation?: CreateLegislationData;
}

function sameIdentity(
  current: Legislation,
  edited: CreateLegislationData,
): boolean {
  return (
    current.type === edited.type &&
    current.number === edited.number &&
    current.year === edited.year &&
    current.issuingBody === edited.issuingBody
  );
}

function hasChanged(
  current: Legislation,
  edited: CreateLegislationData,
): boolean {
  return (
    !sameIdentity(current, edited) ||
    current.summary !== (edited.summary ?? null)
  );
}

@Injectable()
export class UpdateLicenseLegislationUseCase {
  constructor(
    private readonly licenseRepository: LicenseRepository,
    private readonly legislationRepository: LegislationRepository,
    private readonly licenseLegislationRepository: LicenseLegislationRepository,
  ) {}

  /*
   * Edits the cited excerpt of a radar entry and, when the act is on this
   * license's radar only, the act itself. An act shared with other licenses
   * stays untouched: editing it here would silently change their radars.
   */
  async execute(
    licenseId: string,
    licenseLegislationId: string,
    ownerUserId: string,
    input: UpdateLicenseLegislationInput,
  ): Promise<LicenseLegislation> {
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

    const data: UpdateLicenseLegislationData = {};
    if (input.citedExcerpt !== undefined) {
      data.citedExcerpt = input.citedExcerpt;
    }
    if (input.legislation && hasChanged(link.legislation, input.legislation)) {
      data.legislationId = await this.editLegislation(link, input.legislation);
    }

    return this.licenseLegislationRepository.update(link.id, data);
  }

  /** Returns the id of the act the entry points to after the edit. */
  private async editLegislation(
    link: LicenseLegislation,
    edited: CreateLegislationData,
  ): Promise<string> {
    const linkedLicenses =
      await this.licenseLegislationRepository.countByLegislationId(
        link.legislationId,
      );
    if (linkedLicenses > 1) {
      throw new SharedLegislationNotEditableError(link.legislationId);
    }

    if (!sameIdentity(link.legislation, edited)) {
      // The edited data names another act already in the catalog: point the
      // entry to it instead of creating a duplicate.
      const existing = await this.legislationRepository.findByIdentity(edited);
      if (existing) {
        const alreadyLinked =
          await this.licenseLegislationRepository.findByLicenseAndLegislation(
            link.licenseId,
            existing.id,
          );
        if (alreadyLinked) throw new LegislationAlreadyLinkedError(existing.id);

        return existing.id;
      }
    }

    await this.legislationRepository.update(link.legislationId, edited);

    return link.legislationId;
  }
}

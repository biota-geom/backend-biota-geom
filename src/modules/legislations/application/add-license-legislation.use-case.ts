import { Injectable } from '@nestjs/common';
import { LicenseLegislationSource } from '@prisma/client';
import { LicenseNotFoundError } from '../../licenses/domain/errors/license-not-found.error';
import { LicenseRepository } from '../../licenses/domain/licenses.repository';
import { InvalidLegislationReferenceError } from '../domain/errors/invalid-legislation-reference.error';
import { LegislationAlreadyLinkedError } from '../domain/errors/legislation-already-linked.error';
import { LegislationNotFoundError } from '../domain/errors/legislation-not-found.error';
import { CreateLegislationData } from '../domain/legislation.data';
import { Legislation } from '../domain/legislation.entity';
import { LegislationRepository } from '../domain/legislations.repository';
import { LicenseLegislation } from '../domain/license-legislation.entity';
import { LicenseLegislationRepository } from '../domain/license-legislations.repository';

/** Exactly one of `legislationId` (catalog act) or `legislation` (act data). */
export interface AddLicenseLegislationInput {
  legislationId?: string;
  legislation?: CreateLegislationData;
  citedExcerpt?: string | null;
}

@Injectable()
export class AddLicenseLegislationUseCase {
  constructor(
    private readonly licenseRepository: LicenseRepository,
    private readonly legislationRepository: LegislationRepository,
    private readonly licenseLegislationRepository: LicenseLegislationRepository,
  ) {}

  /*
   * Manually puts an act on the radar of a license owned by the caller. Act
   * data matching an act already in the catalog reuses it, so the catalog
   * never holds the same act twice.
   */
  async execute(
    licenseId: string,
    ownerUserId: string,
    input: AddLicenseLegislationInput,
  ): Promise<LicenseLegislation> {
    const license = await this.licenseRepository.findByIdForOwner(
      licenseId,
      ownerUserId,
    );
    if (!license) throw new LicenseNotFoundError(licenseId);

    const legislation = await this.resolveLegislation(input);

    const existing =
      await this.licenseLegislationRepository.findByLicenseAndLegislation(
        license.id,
        legislation.id,
      );
    if (existing) throw new LegislationAlreadyLinkedError(legislation.id);

    return this.licenseLegislationRepository.create({
      licenseId: license.id,
      legislationId: legislation.id,
      source: LicenseLegislationSource.MANUAL,
      citedExcerpt: input.citedExcerpt ?? null,
    });
  }

  private async resolveLegislation(
    input: AddLicenseLegislationInput,
  ): Promise<Legislation> {
    const { legislationId, legislation } = input;
    if (Boolean(legislationId) === Boolean(legislation)) {
      throw new InvalidLegislationReferenceError();
    }

    if (legislation)
      return this.legislationRepository.findOrCreate(legislation);

    const found = await this.legislationRepository.findById(
      legislationId as string,
    );
    if (!found) throw new LegislationNotFoundError(legislationId as string);

    return found;
  }
}

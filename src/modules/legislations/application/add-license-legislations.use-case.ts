import { Injectable, NotFoundException } from '@nestjs/common';
import { LicenseNotFoundError } from '../../licenses/domain/errors/license-not-found.error';
import { LicenseRepository } from '../../licenses/domain/licenses.repository';
import {
  CreateLicenseLegislationBatchItem,
  CreateLicenseLegislationData,
} from '../domain/legislation.data';
import { LegislationRepository } from '../domain/legislations.repository';
import { LicenseLegislation } from '../domain/license-legislation.entity';
import { LicenseLegislationRepository } from '../domain/license-legislations.repository';

@Injectable()
export class AddLicenseLegislationsUseCase {
  constructor(
    private readonly licenseRepository: LicenseRepository,
    private readonly legislationRepository: LegislationRepository,
    private readonly licenseLegislationRepository: LicenseLegislationRepository,
  ) {}

  async execute(
    licenseId: string,
    ownerUserId: string,
    legislations: CreateLicenseLegislationBatchItem[],
  ): Promise<LicenseLegislation[]> {
    const license = await this.licenseRepository.findByIdForOwner(
      licenseId,
      ownerUserId,
    );
    if (!license) throw new LicenseNotFoundError(licenseId);

    const linkData: CreateLicenseLegislationData[] = [];
    for (const item of legislations) {
      let legislationId = item.legislationId;
      if (item.legislation) {
        const legislation = await this.legislationRepository.findOrCreate(
          item.legislation,
        );
        legislationId = legislation.id;
      } else if (legislationId) {
        const legislation =
          await this.legislationRepository.findById(legislationId);
        if (!legislation) throw new NotFoundException();
      } else {
        throw new NotFoundException();
      }

      linkData.push({
        licenseId: license.id,
        legislationId,
        source: item.source,
        citedExcerpt: item.citedExcerpt,
        impact: item.impact,
      });
    }

    return this.licenseLegislationRepository.createMany(linkData);
  }
}

import { Injectable } from '@nestjs/common';
import { LicenseStatus } from '@prisma/client';
import { FileStorage, FileToStore } from '../../../common/storage/file-storage';
import { calculateLicenseStatus } from '../domain/license-status.calculator';
import { License } from '../domain/license.entity';
import { LicenseRepository } from '../domain/licenses.repository';
import { RenewalConditionDecision } from '../domain/renew-license.data';
import { InvalidLicenseDateRangeError } from '../domain/errors/invalid-license-date-range.error';
import { LicenseAlreadyArchivedError } from '../domain/errors/license-already-archived.error';
import { LicenseConditionLicenseMismatchError } from '../domain/errors/license-condition-license-mismatch.error';
import { LicenseNotFoundError } from '../domain/errors/license-not-found.error';
import { RenewalConditionsIncompleteError } from '../domain/errors/renewal-conditions-incomplete.error';

export interface RenewLicenseInput {
  licenseId: string;
  ownerUserId: string;
  processNumber: string;
  issueDate: Date;
  expirationDate: Date;
  file: FileToStore;
  conditions: RenewalConditionDecision[];
}

@Injectable()
export class RenewLicenseUseCase {
  constructor(
    private readonly licenseRepository: LicenseRepository,
    private readonly documentStorage: FileStorage,
  ) {}

  async execute(input: RenewLicenseInput): Promise<License> {
    const previousLicense = await this.licenseRepository.findByIdForOwner(
      input.licenseId,
      input.ownerUserId,
    );
    if (!previousLicense) {
      throw new LicenseNotFoundError(input.licenseId);
    }

    if (previousLicense.status === LicenseStatus.ARCHIVED) {
      throw new LicenseAlreadyArchivedError(input.licenseId);
    }

    if (input.expirationDate <= input.issueDate) {
      throw new InvalidLicenseDateRangeError();
    }

    await this.assertConditionsDecided(previousLicense.id, input.conditions);

    const { url: documentUrl } = await this.documentStorage.upload(input.file, {
      category: 'licenses',
      customerId: previousLicense.customerId,
    });

    return this.licenseRepository.renew({
      previousLicenseId: previousLicense.id,
      customerId: previousLicense.customerId,
      type: previousLicense.type,
      processNumber: input.processNumber,
      issuingAgency: previousLicense.issuingAgency,
      issueDate: input.issueDate,
      expirationDate: input.expirationDate,
      status: calculateLicenseStatus(input.expirationDate),
      documentUrl,
      conditions: input.conditions,
    });
  }

  /*
   * A renewal can only be concluded once every condition of the previous
   * license was marked fulfilled or not, exactly once. Ids from another
   * license are rejected so a caller can't touch conditions it doesn't own.
   */
  private async assertConditionsDecided(
    licenseId: string,
    decisions: RenewalConditionDecision[],
  ): Promise<void> {
    const conditions =
      await this.licenseRepository.findConditionsByLicenseId(licenseId);
    const validIds = new Set(conditions.map((condition) => condition.id));
    const decidedIds = new Set(decisions.map((item) => item.conditionId));

    if (decisions.some((item) => !validIds.has(item.conditionId))) {
      throw new LicenseConditionLicenseMismatchError();
    }

    if (
      decidedIds.size !== decisions.length ||
      decidedIds.size !== validIds.size
    ) {
      throw new RenewalConditionsIncompleteError();
    }
  }
}

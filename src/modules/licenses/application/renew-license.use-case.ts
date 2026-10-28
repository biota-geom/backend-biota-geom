import { Injectable } from '@nestjs/common';
import { LicenseStatus } from '@prisma/client';
import { FileStorage, FileToStore } from '../../../common/storage/file-storage';
import { calculateLicenseStatus } from '../domain/license-status.calculator';
import { License } from '../domain/license.entity';
import { LicenseRepository } from '../domain/licenses.repository';
import { InvalidLicenseDateRangeError } from '../domain/errors/invalid-license-date-range.error';
import { LicenseAlreadyArchivedError } from '../domain/errors/license-already-archived.error';
import { LicenseNotFoundError } from '../domain/errors/license-not-found.error';

export interface RenewLicenseInput {
  licenseId: string;
  ownerUserId: string;
  processNumber: string;
  issueDate: Date;
  expirationDate: Date;
  file: FileToStore;
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
    });
  }
}

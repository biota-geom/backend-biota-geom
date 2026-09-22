import { Injectable } from '@nestjs/common';
import { LicenseType } from '@prisma/client';
import { CustomerRepository } from '../../customers/domain/customers.repository';
import { CustomerNotFoundError } from '../../customers/domain/errors/customer-not-found.error';
import { IssuingAgencyRepository } from '../../issuing-agencies/domain/issuing-agencies.repository';
import {
  FileToStore,
  LicenseDocumentStorage,
} from '../domain/license-document-storage';
import { calculateLicenseStatus } from '../domain/license-status.calculator';
import { InvalidLicenseDateRangeError } from '../domain/errors/invalid-license-date-range.error';
import { IssuingAgencyNotFoundError } from '../domain/errors/issuing-agency-not-found.error';
import { License } from '../domain/license.entity';
import { LicenseRepository } from '../domain/licenses.repository';

export interface CreateLicenseInput {
  customerId: string;
  // From the authenticated token — used only to scope the customer lookup,
  // never persisted on the license itself.
  ownerUserId: string;
  type: LicenseType;
  processNumber: string;
  issuingAgencyId: string;
  issueDate: Date;
  expirationDate: Date;
  file: FileToStore;
}

@Injectable()
export class CreateLicenseUseCase {
  constructor(
    private readonly licenseRepository: LicenseRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly issuingAgencyRepository: IssuingAgencyRepository,
    private readonly documentStorage: LicenseDocumentStorage,
  ) {}

  async execute(input: CreateLicenseInput): Promise<License> {
    /*
     * Same indistinguishable-404 rule as the rest of the app (see
     * CustomerRepository): a customer that exists but belongs to another
     * owner must read exactly like one that does not exist at all.
     */
    const customer = await this.customerRepository.findOne(
      input.customerId,
      input.ownerUserId,
    );
    if (!customer) {
      throw new CustomerNotFoundError(input.customerId);
    }

    const issuingAgencyExists = await this.issuingAgencyRepository.existsById(
      input.issuingAgencyId,
    );
    if (!issuingAgencyExists) {
      throw new IssuingAgencyNotFoundError(input.issuingAgencyId);
    }

    if (input.expirationDate <= input.issueDate) {
      throw new InvalidLicenseDateRangeError();
    }

    // Uploaded last, only once every other check has passed, so a rejected
    // request never leaves an orphaned file in storage.
    const { url: documentUrl } = await this.documentStorage.upload(
      input.file,
      input.customerId,
    );

    // Never trust a client-supplied status (see the ticket): always derived
    // from expirationDate at insert time.
    const status = calculateLicenseStatus(input.expirationDate);

    return this.licenseRepository.create({
      customerId: input.customerId,
      type: input.type,
      processNumber: input.processNumber,
      issuingAgencyId: input.issuingAgencyId,
      issueDate: input.issueDate,
      expirationDate: input.expirationDate,
      status,
      documentUrl,
    });
  }
}

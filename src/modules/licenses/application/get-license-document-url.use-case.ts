import { Injectable } from '@nestjs/common';
import {
  DocumentAccessUrl,
  LicenseDocumentStorage,
} from '../domain/license-document-storage';
import { LicenseRepository } from '../domain/licenses.repository';
import { LicenseNotFoundError } from '../domain/errors/license-not-found.error';

@Injectable()
export class GetLicenseDocumentUrlUseCase {
  constructor(
    private readonly licenseRepository: LicenseRepository,
    private readonly documentStorage: LicenseDocumentStorage,
  ) {}

  /*
   * Tenant isolation: the license is looked up through its customer's owner,
   * so a license from another tenant is indistinguishable from a missing one
   * and no URL is ever signed for it.
   */
  async execute(
    licenseId: string,
    ownerUserId: string,
  ): Promise<DocumentAccessUrl> {
    const license = await this.licenseRepository.findByIdForOwner(
      licenseId,
      ownerUserId,
    );
    if (!license) throw new LicenseNotFoundError(licenseId);

    return this.documentStorage.getAccessUrl(license.documentUrl);
  }
}

import { Injectable } from '@nestjs/common';
import { LicenseNotFoundError } from '../domain/errors/license-not-found.error';
import { currentLicenseStatus } from '../domain/license-status.calculator';
import { License } from '../domain/license.entity';
import { LicenseRepository } from '../domain/licenses.repository';

@Injectable()
export class ListLicenseHistoryUseCase {
  constructor(private readonly licenseRepository: LicenseRepository) {}

  /*
   * Returns every version of the license's renewal chain, newest first: the
   * renewals that replaced it and the versions it replaced. A chain never
   * leaves its customer, so loading that customer's licenses once (after the
   * owner check on the requested one) is enough to walk it both ways.
   */
  async execute(licenseId: string, ownerUserId: string): Promise<License[]> {
    const requested = await this.licenseRepository.findByIdForOwner(
      licenseId,
      ownerUserId,
    );
    if (!requested) throw new LicenseNotFoundError(licenseId);

    const licenses = await this.licenseRepository.findAllByCustomerId(
      requested.customerId,
    );
    const byId = new Map(licenses.map((license) => [license.id, license]));
    const renewalByPreviousId = new Map<string, License>();
    [...licenses]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .forEach((license) => {
        // Oldest renewal wins if a license was ever renewed twice.
        if (license.previousLicenseId) {
          renewalByPreviousId.set(license.previousLicenseId, license);
        }
      });

    const seen = new Set([requested.id]);
    const newer: License[] = [];
    let next = renewalByPreviousId.get(requested.id);
    while (next && !seen.has(next.id)) {
      newer.unshift(next);
      seen.add(next.id);
      next = renewalByPreviousId.get(next.id);
    }

    const older: License[] = [];
    let previous = requested.previousLicenseId
      ? byId.get(requested.previousLicenseId)
      : undefined;
    while (previous && !seen.has(previous.id)) {
      older.push(previous);
      seen.add(previous.id);
      previous = previous.previousLicenseId
        ? byId.get(previous.previousLicenseId)
        : undefined;
    }

    const now = new Date();
    return [...newer, requested, ...older].map((license) => ({
      ...license,
      status: currentLicenseStatus(license, now),
    }));
  }
}

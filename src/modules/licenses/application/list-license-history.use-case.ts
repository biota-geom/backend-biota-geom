import { Injectable } from '@nestjs/common';
import { LicenseNotFoundError } from '../domain/errors/license-not-found.error';
import { License } from '../domain/license.entity';
import { LicenseRepository } from '../domain/licenses.repository';

@Injectable()
export class ListLicenseHistoryUseCase {
  constructor(private readonly licenseRepository: LicenseRepository) {}

  /*
   * Returns the license and its previous versions, newest first. Every hop is
   * resolved through the owner check, so a chain can never leak a license
   * from another owner.
   */
  async execute(licenseId: string, ownerUserId: string): Promise<License[]> {
    const first = await this.licenseRepository.findByIdForOwner(
      licenseId,
      ownerUserId,
    );
    if (!first) throw new LicenseNotFoundError(licenseId);

    const history: License[] = [first];
    const seen = new Set([first.id]);
    let previousId = first.previousLicenseId;

    while (previousId && !seen.has(previousId)) {
      const previous = await this.licenseRepository.findByIdForOwner(
        previousId,
        ownerUserId,
      );
      if (!previous) break;

      history.push(previous);
      seen.add(previous.id);
      previousId = previous.previousLicenseId;
    }

    return history;
  }
}

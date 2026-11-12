import { Injectable } from '@nestjs/common';
import {
  CreateLicenseLegislationData,
  ListLicenseLegislationsFilter,
  UpdateLicenseLegislationData,
} from './legislation.data';
import { LicenseLegislation } from './license-legislation.entity';

@Injectable()
export abstract class LicenseLegislationRepository {
  /**
   * Most recent legislation year first; ties keep the newest link first.
   * Optionally narrowed to one impact level.
   */
  abstract findAllByLicenseId(
    licenseId: string,
    filter?: ListLicenseLegislationsFilter,
  ): Promise<LicenseLegislation[]>;
  abstract findByIdForLicense(
    id: string,
    licenseId: string,
  ): Promise<LicenseLegislation | null>;
  abstract create(
    data: CreateLicenseLegislationData,
  ): Promise<LicenseLegislation>;
  abstract update(
    id: string,
    data: UpdateLicenseLegislationData,
  ): Promise<LicenseLegislation>;
  abstract delete(id: string): Promise<void>;
}

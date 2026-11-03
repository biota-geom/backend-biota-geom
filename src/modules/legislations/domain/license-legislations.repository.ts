import { Injectable } from '@nestjs/common';
import {
  CreateLicenseLegislationData,
  UpdateLicenseLegislationData,
} from './legislation.data';
import { LicenseLegislation } from './license-legislation.entity';

@Injectable()
export abstract class LicenseLegislationRepository {
  /** Newest first. */
  abstract findAllByLicenseId(licenseId: string): Promise<LicenseLegislation[]>;
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

import { Injectable } from '@nestjs/common';
import {
  CreateLicenseLegislationData,
  UpdateLicenseLegislationData,
} from './legislation.data';
import { LicenseLegislation } from './license-legislation.entity';

@Injectable()
export abstract class LicenseLegislationRepository {
  /** Most recent legislation year first; ties keep the newest link first. */
  abstract findAllByLicenseId(licenseId: string): Promise<LicenseLegislation[]>;
  abstract findByIdForLicense(
    id: string,
    licenseId: string,
  ): Promise<LicenseLegislation | null>;
  abstract findByLicenseAndLegislation(
    licenseId: string,
    legislationId: string,
  ): Promise<LicenseLegislation | null>;
  /** How many licenses have the legislation on their radar. */
  abstract countByLegislationId(legislationId: string): Promise<number>;
  /** Throws LegislationAlreadyLinkedError when the license already links the act. */
  abstract create(
    data: CreateLicenseLegislationData,
  ): Promise<LicenseLegislation>;
  /** Throws LegislationAlreadyLinkedError when relinking to an act the license already links. */
  abstract update(
    id: string,
    data: UpdateLicenseLegislationData,
  ): Promise<LicenseLegislation>;
  abstract delete(id: string): Promise<void>;
}

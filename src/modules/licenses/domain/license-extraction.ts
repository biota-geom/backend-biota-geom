import {
  ConditionPeriodicity,
  ConditionType,
  LicenseType,
} from '@prisma/client';

/*
 * What an AI reading of a license PDF can suggest. Every field is nullable on
 * purpose: a value the document does not state clearly is reported as
 * missing, never guessed, and is left for the user to fill in manually.
 *
 * Dates are calendar dates (YYYY-MM-DD) exactly as printed on the document —
 * no time zone is involved, so they map 1:1 onto the form's date inputs.
 */
export interface ExtractedLicenseData {
  type: LicenseType | null;
  processNumber: string | null;
  // Name or acronym as printed; matching it to a registered agency is the
  // caller's job (the extraction never invents an issuing_agency_id).
  issuingAgency: string | null;
  issueDate: string | null;
  expirationDate: string | null;
}

/*
 * Mirrors the fields of the existing batch condition contract that a license
 * document can actually state. Risk level and compliance status are left out
 * on purpose: they are derived by the backend rules when the condition is
 * saved, never decided by the model.
 */
export interface SuggestedCondition {
  environmentalDescriptor: string | null;
  description: string;
  conditionType: ConditionType | null;
  periodicity: ConditionPeriodicity | null;
  dueDate: string | null;
}

export interface LicenseExtraction {
  extractedData: ExtractedLicenseData;
  suggestedConditions: SuggestedCondition[];
}

/*
 * Port for the component that reads a license PDF. Implementations must not
 * persist anything — extraction only ever produces suggestions.
 */
export abstract class LicenseDocumentExtractor {
  abstract extract(document: Buffer): Promise<LicenseExtraction>;
}

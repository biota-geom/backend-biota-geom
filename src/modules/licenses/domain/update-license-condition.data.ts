/*
 * The full set of editable fields of a condition — PUT replaces the record,
 * so every field is required. `riskLevel` is deliberately absent: it is
 * derived from `dueDate` on read (see calculateLicenseConditionRiskLevel)
 * and is never accepted from a client, the same rule License.status follows.
 */
export interface UpdateLicenseConditionData {
  licenseId: string;
  title: string;
  description: string;
  category: string;
  dueDate: Date;
}

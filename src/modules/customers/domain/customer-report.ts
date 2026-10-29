import { DocumentType } from '@prisma/client';

export interface CustomerReportHeader {
  companyName: string;
  document: string;
  documentType: DocumentType;
  segment: string | null;
  generatedAt: Date;
}

export interface CustomerReportLicenses {
  active: number;
  regular: number;
  attention: number;
  expired: number;
}

export interface CustomerReportConditions {
  totalActive: number;
  inCompliance: number;
  compliancePercentage: number;
  pending: number;
}

export interface CustomerReportEsgIndicator {
  name: string;
  unit: string;
  /** Null when the indicator has no record in the reference month. */
  value: number | null;
  /** Null on the first month, when there is nothing to compare against. */
  variationPercentage: number | null;
}

export interface CustomerReportEsg {
  /** `AAAA-MM`, or null when the company has no record at all. */
  referenceMonth: string | null;
  indicators: CustomerReportEsgIndicator[];
}

export interface CustomerReport {
  header: CustomerReportHeader;
  licenses: CustomerReportLicenses;
  conditions: CustomerReportConditions;
  esg: CustomerReportEsg;
}

const ACCENT_MARKS = /[̀-ͯ]/g;
const NON_SLUG_CHARS = /[^a-z0-9]+/g;
const EDGE_DASHES = /^-+|-+$/g;

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(ACCENT_MARKS, '')
    .toLowerCase()
    .replace(NON_SLUG_CHARS, '-')
    .replace(EDGE_DASHES, '');
}

/** `relatorio-<empresa>-<AAAA-MM-DD>.pdf`, as agreed in planning#100. */
export function buildCustomerReportFileName(
  companyName: string,
  generatedAt: Date,
): string {
  const slug = slugify(companyName) || 'empresa';
  const date = generatedAt.toISOString().slice(0, 10);

  return `relatorio-${slug}-${date}.pdf`;
}

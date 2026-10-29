import { ConditionPeriodicity, ConditionType } from '@prisma/client';
import { z } from 'zod';
import { UnreadableLicenseDocumentError } from '../../domain/errors/unreadable-license-document.error';
import {
  LicenseExtraction,
  SuggestedCondition,
} from '../../domain/license-extraction';

// Same limits the registration form and the batch condition DTO enforce, so a
// suggestion never arrives already invalid for the form it pre-fills.
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_DESCRIPTOR_LENGTH = 120;
const MAX_TYPE_LENGTH = 50;
const MAX_PROCESS_NUMBER_LENGTH = 100;
const MAX_AGENCY_LENGTH = 150;
const MAX_CONDITIONS = 200;

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function isCalendarDate(value: string): boolean {
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return false;

  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/*
 * Field-level fallbacks (`.catch(null)`) instead of failing the whole answer:
 * one malformed date must not throw away an otherwise good reading. A value
 * that does not validate is reported as "not identified", never passed on.
 */
const nullableText = (maxLength: number) =>
  z
    .string()
    .transform((value) => value.replace(/\s+/g, ' ').trim())
    .transform((value) => (value ? value.slice(0, maxLength) : null))
    .nullable()
    .catch(null);

const nullableDate = z
  .string()
  .trim()
  .refine(isCalendarDate)
  .nullable()
  .catch(null);

const nullableEnum = <T extends Record<string, string>>(values: T) =>
  z.enum(values).nullable().catch(null);

const extractedDataSchema = z.object({
  type: nullableText(MAX_TYPE_LENGTH).default(null),
  process_number: nullableText(MAX_PROCESS_NUMBER_LENGTH).default(null),
  issuing_agency: nullableText(MAX_AGENCY_LENGTH).default(null),
  issue_date: nullableDate.default(null),
  expiration_date: nullableDate.default(null),
});

const suggestedConditionSchema = z.object({
  environmental_descriptor: nullableText(MAX_DESCRIPTOR_LENGTH).default(null),
  description: z
    .string()
    .transform((value) => value.replace(/\s+/g, ' ').trim())
    .pipe(z.string().min(1))
    .transform((value) => value.slice(0, MAX_DESCRIPTION_LENGTH)),
  condition_type: nullableEnum(ConditionType).default(null),
  periodicity: nullableEnum(ConditionPeriodicity).default(null),
  due_date: nullableDate.default(null),
});

const modelAnswerSchema = z.object({
  extracted_data: extractedDataSchema,
  suggested_conditions: z.array(z.unknown()).catch([]).default([]),
});

function toSuggestedCondition(
  raw: z.output<typeof suggestedConditionSchema>,
): SuggestedCondition {
  // A stated frequency only makes sense on a recurring condition; an
  // informative one never carries a periodicity (same rule as the form).
  const conditionType =
    raw.condition_type ?? (raw.periodicity ? ConditionType.PERIODIC : null);

  return {
    environmentalDescriptor: raw.environmental_descriptor,
    description: raw.description,
    conditionType,
    periodicity:
      conditionType === ConditionType.PERIODIC ? raw.periodicity : null,
    dueDate: raw.due_date,
  };
}

/*
 * Models sometimes wrap JSON in markdown fences or add a sentence around it
 * despite the prompt; keep only the outermost JSON object.
 */
function extractJsonObject(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');

  if (start === -1 || end <= start) {
    throw new UnreadableLicenseDocumentError('model answer has no JSON object');
  }

  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new UnreadableLicenseDocumentError('model answer is not valid JSON');
  }
}

export function parseLicenseExtraction(text: string): LicenseExtraction {
  const result = modelAnswerSchema.safeParse(extractJsonObject(text));

  if (!result.success) {
    throw new UnreadableLicenseDocumentError(
      'model answer does not match the extraction contract',
    );
  }

  const { extracted_data: data, suggested_conditions: conditions } =
    result.data;

  // Conditions are validated one by one: an entry without a description is
  // dropped instead of invalidating the rest of the list.
  const suggestedConditions = conditions
    .map((condition) => suggestedConditionSchema.safeParse(condition))
    .filter((parsed) => parsed.success)
    .map((parsed) => toSuggestedCondition(parsed.data))
    .slice(0, MAX_CONDITIONS);

  return {
    extractedData: {
      type: data.type,
      processNumber: data.process_number,
      issuingAgency: data.issuing_agency,
      issueDate: data.issue_date,
      expirationDate: data.expiration_date,
    },
    suggestedConditions,
  };
}

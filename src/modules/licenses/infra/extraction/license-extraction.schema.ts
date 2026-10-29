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

const nullable = (schema: Record<string, unknown>) => ({
  anyOf: [schema, { type: 'null' }],
});

/*
 * Answer shape sent to the model as a structured output, so the response is
 * always well-formed JSON. Conditions come grouped by section (the descriptor
 * is written once, not once per item) and carry their printed number, which
 * the parser below uses to drop repeats and to add the parent's context.
 */
export const LICENSE_EXTRACTION_OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['extracted_data', 'sections'],
  properties: {
    extracted_data: {
      type: 'object',
      additionalProperties: false,
      required: [
        'type',
        'process_number',
        'issuing_agency',
        'issue_date',
        'expiration_date',
      ],
      properties: {
        type: nullable({ type: 'string' }),
        process_number: nullable({ type: 'string' }),
        issuing_agency: nullable({ type: 'string' }),
        issue_date: nullable({ type: 'string', format: 'date' }),
        expiration_date: nullable({ type: 'string', format: 'date' }),
      },
    },
    sections: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['descriptor', 'items'],
        properties: {
          descriptor: nullable({ type: 'string' }),
          items: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: [
                'number',
                'description',
                'condition_type',
                'periodicity',
                'due_date',
              ],
              properties: {
                number: nullable({ type: 'string' }),
                description: { type: 'string' },
                condition_type: {
                  type: 'string',
                  enum: Object.values(ConditionType),
                },
                periodicity: nullable({
                  type: 'string',
                  enum: Object.values(ConditionPeriodicity),
                }),
                due_date: nullable({ type: 'string', format: 'date' }),
              },
            },
          },
        },
      },
    },
  },
} as const;

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

function collapseSpaces(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function capitalize(value: string): string {
  return value.charAt(0).toLocaleUpperCase('pt-BR') + value.slice(1);
}

// Cuts at a word boundary so a long description never ends mid-word.
function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;

  const cut = value.slice(0, maxLength - 1);
  const lastSpace = cut.lastIndexOf(' ');

  return `${(lastSpace > maxLength / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/*
 * Field-level fallbacks (`.catch(null)`) instead of failing the whole answer:
 * one malformed date must not throw away an otherwise good reading. A value
 * that does not validate is reported as "not identified", never passed on.
 */
const nullableText = (maxLength: number) =>
  z
    .string()
    .transform(collapseSpaces)
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

const itemSchema = z.object({
  number: z
    .string()
    .transform((value) => value.trim().replace(/[\s.-]+$/, ''))
    .transform((value) => value || null)
    .nullable()
    .catch(null)
    .default(null),
  description: z.string().transform(collapseSpaces).pipe(z.string().min(1)),
  condition_type: nullableEnum(ConditionType).default(null),
  periodicity: nullableEnum(ConditionPeriodicity).default(null),
  due_date: nullableDate.default(null),
});

const sectionSchema = z.object({
  descriptor: nullableText(MAX_DESCRIPTOR_LENGTH)
    .transform((value) => (value ? capitalize(value) : null))
    .default(null),
  items: z.array(z.unknown()).catch([]).default([]),
});

const modelAnswerSchema = z.object({
  extracted_data: extractedDataSchema,
  sections: z.array(z.unknown()).catch([]).default([]),
});

type ParsedItem = z.output<typeof itemSchema> & {
  descriptor: string | null;
};

// "2.5.1" -> "2.5"; top-level numbers ("2") have no parent.
function parentNumber(number: string): string | null {
  const cut = number.lastIndexOf('.');
  return cut > 0 ? number.slice(0, cut) : null;
}

// An item that only introduces its sub-items, such as
// "2.5- no caso de transporte de resíduos de serviços de saúde:".
function isIntroductory(description: string): boolean {
  return description.endsWith(':');
}

/*
 * The list is flat, so a sub-item shown alone would lose what its
 * introductory parent says ("o compartimento de carga deve ser estanque" is
 * only about health-care waste). Each sub-item therefore starts with the text
 * of every introductory ancestor, in order. The introductory item itself keeps
 * only its own text.
 */
function withParentContext(items: ParsedItem[]): string[] {
  const contextByNumber = new Map<string, string>();

  return items.map((item) => {
    const parent = item.number ? parentNumber(item.number) : null;
    const parentContext = parent ? contextByNumber.get(parent) : undefined;
    const description = parentContext
      ? `${capitalize(parentContext)} ${item.description}`
      : item.description;

    if (item.number && isIntroductory(item.description)) {
      contextByNumber.set(item.number, description);
    }

    return description;
  });
}

function toSuggestedCondition(
  item: ParsedItem,
  description: string,
): SuggestedCondition {
  // A stated frequency only makes sense on a recurring condition; an
  // informative one never carries a periodicity (same rule as the form).
  const conditionType =
    item.condition_type ?? (item.periodicity ? ConditionType.PERIODIC : null);

  return {
    environmentalDescriptor: item.descriptor,
    description: truncate(description, MAX_DESCRIPTION_LENGTH),
    conditionType,
    periodicity:
      conditionType === ConditionType.PERIODIC ? item.periodicity : null,
    dueDate: item.due_date,
  };
}

/*
 * Structured outputs return bare JSON, but a fence or a sentence around it
 * costs nothing to tolerate; keep only the outermost JSON object.
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

function flattenSections(sections: unknown[]): ParsedItem[] {
  const seenNumbers = new Set<string>();
  const items: ParsedItem[] = [];

  for (const rawSection of sections) {
    const section = sectionSchema.safeParse(rawSection);
    if (!section.success) continue;

    for (const rawItem of section.data.items) {
      // An entry without a description is dropped instead of invalidating
      // the rest of the list.
      const item = itemSchema.safeParse(rawItem);
      if (!item.success) continue;

      // Each printed number is one condition: a repeated number is the model
      // going over the same item twice, never a second obligation.
      if (item.data.number) {
        if (seenNumbers.has(item.data.number)) continue;
        seenNumbers.add(item.data.number);
      }

      items.push({ ...item.data, descriptor: section.data.descriptor });
    }
  }

  return items;
}

export function parseLicenseExtraction(text: string): LicenseExtraction {
  const result = modelAnswerSchema.safeParse(extractJsonObject(text));

  if (!result.success) {
    throw new UnreadableLicenseDocumentError(
      'model answer does not match the extraction contract',
    );
  }

  const { extracted_data: data, sections } = result.data;
  const items = flattenSections(sections);
  const descriptions = withParentContext(items);

  return {
    extractedData: {
      type: data.type,
      processNumber: data.process_number,
      issuingAgency: data.issuing_agency,
      issueDate: data.issue_date,
      expirationDate: data.expiration_date,
    },
    suggestedConditions: items
      .map((item, index) => toSuggestedCondition(item, descriptions[index]))
      .slice(0, MAX_CONDITIONS),
  };
}

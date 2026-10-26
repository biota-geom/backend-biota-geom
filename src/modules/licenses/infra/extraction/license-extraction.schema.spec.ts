import { UnreadableLicenseDocumentError } from '../../domain/errors/unreadable-license-document.error';
import { parseLicenseExtraction } from './license-extraction.schema';

function answer(value: unknown): string {
  return JSON.stringify(value);
}

const FULL_ANSWER = {
  extracted_data: {
    type: 'LO',
    process_number: 'LO nº 118/2020',
    issuing_agency: 'FEPAM',
    issue_date: '2020-01-10',
    expiration_date: '2025-01-10',
  },
  suggested_conditions: [
    {
      environmental_descriptor: 'Resíduos Sólidos',
      description: 'Apresentar relatório semestral',
      condition_type: 'PERIODIC',
      periodicity: 'SEMIANNUAL',
      due_date: '2025-07-10',
    },
  ],
};

describe('parseLicenseExtraction', () => {
  it('maps a valid answer onto the extraction contract', () => {
    expect(parseLicenseExtraction(answer(FULL_ANSWER))).toEqual({
      extractedData: {
        type: 'LO',
        processNumber: 'LO nº 118/2020',
        issuingAgency: 'FEPAM',
        issueDate: '2020-01-10',
        expirationDate: '2025-01-10',
      },
      suggestedConditions: [
        {
          environmentalDescriptor: 'Resíduos Sólidos',
          description: 'Apresentar relatório semestral',
          conditionType: 'PERIODIC',
          periodicity: 'SEMIANNUAL',
          dueDate: '2025-07-10',
        },
      ],
    });
  });

  it('ignores markdown fences and text around the JSON object', () => {
    const text = `Aqui está:\n\`\`\`json\n${answer(FULL_ANSWER)}\n\`\`\`\nFim.`;

    expect(parseLicenseExtraction(text).extractedData.type).toBe('LO');
  });

  it('turns invalid or missing fields into null instead of failing', () => {
    const result = parseLicenseExtraction(
      answer({
        extracted_data: {
          type: 'LU',
          process_number: '   ',
          issue_date: '28/04/2022',
          expiration_date: '2027-02-30',
        },
      }),
    );

    expect(result).toEqual({
      extractedData: {
        type: null,
        processNumber: null,
        issuingAgency: null,
        issueDate: null,
        expirationDate: null,
      },
      suggestedConditions: [],
    });
  });

  it('drops conditions without a description and keeps the valid ones', () => {
    const result = parseLicenseExtraction(
      answer({
        extracted_data: FULL_ANSWER.extracted_data,
        suggested_conditions: [
          { description: '' },
          { description: null },
          'not an object',
          { description: '  Manter   o MTR\n no veículo. ' },
        ],
      }),
    );

    expect(result.suggestedConditions).toEqual([
      {
        environmentalDescriptor: null,
        description: 'Manter o MTR no veículo.',
        conditionType: null,
        periodicity: null,
        dueDate: null,
      },
    ]);
  });

  it('treats a non-array condition list as empty', () => {
    const result = parseLicenseExtraction(
      answer({ ...FULL_ANSWER, suggested_conditions: 'none' }),
    );

    expect(result.suggestedConditions).toEqual([]);
  });

  it('never returns a periodicity on a non-periodic condition', () => {
    const result = parseLicenseExtraction(
      answer({
        ...FULL_ANSWER,
        suggested_conditions: [
          {
            description: 'Informativa',
            condition_type: 'INFORMATIVE',
            periodicity: 'ANNUAL',
          },
          { description: 'Sem tipo', periodicity: 'MONTHLY' },
          { description: 'Inválida', periodicity: 'WEEKLY' },
        ],
      }),
    );

    expect(
      result.suggestedConditions.map(({ conditionType, periodicity }) => ({
        conditionType,
        periodicity,
      })),
    ).toEqual([
      { conditionType: 'INFORMATIVE', periodicity: null },
      { conditionType: 'PERIODIC', periodicity: 'MONTHLY' },
      { conditionType: null, periodicity: null },
    ]);
  });

  it('truncates texts to the limits the registration form accepts', () => {
    const result = parseLicenseExtraction(
      answer({
        ...FULL_ANSWER,
        suggested_conditions: [
          {
            description: 'a'.repeat(600),
            environmental_descriptor: 'b'.repeat(200),
          },
        ],
      }),
    );

    expect(result.suggestedConditions[0].description).toHaveLength(500);
    expect(result.suggestedConditions[0].environmentalDescriptor).toHaveLength(
      120,
    );
  });

  it('caps the number of suggested conditions', () => {
    const result = parseLicenseExtraction(
      answer({
        ...FULL_ANSWER,
        suggested_conditions: Array.from({ length: 250 }, (_, index) => ({
          description: `Item ${index}`,
        })),
      }),
    );

    expect(result.suggestedConditions).toHaveLength(200);
  });

  it.each([
    ['an answer without JSON', 'Não consegui ler o documento.'],
    ['malformed JSON', '{"extracted_data": {'],
    [
      'a truncated answer',
      '{"extracted_data": {"type": "LO"}, "suggested_conditions": [{"description": "x"}',
    ],
    ['a JSON without extracted_data', answer({ suggested_conditions: [] })],
    ['a JSON array', '[1, 2]'],
  ])('rejects %s', (_label, text) => {
    expect(() => parseLicenseExtraction(text)).toThrow(
      UnreadableLicenseDocumentError,
    );
  });
});

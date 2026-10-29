import { UnreadableLicenseDocumentError } from '../../domain/errors/unreadable-license-document.error';
import { parseLicenseExtraction } from './license-extraction.schema';

function answer(value: unknown): string {
  return JSON.stringify(value);
}

function item(number: string | null, description: string, extra = {}) {
  return {
    number,
    description,
    condition_type: 'INFORMATIVE',
    periodicity: null,
    due_date: null,
    ...extra,
  };
}

const EXTRACTED_DATA = {
  type: 'LO',
  process_number: 'LO nº 118/2020',
  issuing_agency: 'FEPAM',
  issue_date: '2020-01-10',
  expiration_date: '2025-01-10',
};

const FULL_ANSWER = {
  extracted_data: EXTRACTED_DATA,
  sections: [
    {
      descriptor: 'Resíduos Sólidos',
      items: [
        item('2.1', 'Apresentar relatório semestral', {
          condition_type: 'PERIODIC',
          periodicity: 'SEMIANNUAL',
          due_date: '2025-07-10',
        }),
      ],
    },
  ],
};

function descriptions(sections: unknown[]): string[] {
  return parseLicenseExtraction(
    answer({ extracted_data: EXTRACTED_DATA, sections }),
  ).suggestedConditions.map((condition) => condition.description);
}

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
          type: 42,
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

  it('keeps any license type as printed, since the type is free text', () => {
    const result = parseLicenseExtraction(
      answer({ extracted_data: { type: '  LAO ' } }),
    );

    expect(result.extractedData.type).toBe('LAO');
  });

  it('flattens the sections in order, each item carrying its section descriptor', () => {
    const result = parseLicenseExtraction(
      answer({
        extracted_data: EXTRACTED_DATA,
        sections: [
          { descriptor: 'vegetação', items: [item('1.1', 'Preservar')] },
          { descriptor: null, items: [item('2.1', 'Atender')] },
        ],
      }),
    );

    expect(
      result.suggestedConditions.map((condition) => [
        condition.environmentalDescriptor,
        condition.description,
      ]),
    ).toEqual([
      ['Vegetação', 'Preservar'],
      [null, 'Atender'],
    ]);
  });

  it('drops items without a description and keeps the valid ones', () => {
    expect(
      descriptions([
        {
          descriptor: 'Transporte',
          items: [
            item('1.1', ''),
            { number: '1.2', description: null },
            'not an object',
            item('1.3', '  Manter   o MTR\n no veículo. '),
          ],
        },
        'not a section',
      ]),
    ).toEqual(['Manter o MTR no veículo.']);
  });

  it('keeps a single entry per printed number, even when the model repeats one', () => {
    expect(
      descriptions([
        {
          descriptor: 'Obras',
          items: [item('8.1', 'Atender'), item('8.2', 'Sinalizar')],
        },
        {
          descriptor: 'Obras',
          items: [item('8.1.', 'Atender'), item('8.3', 'Destinar')],
        },
      ]),
    ).toEqual(['Atender', 'Sinalizar', 'Destinar']);
  });

  it('keeps items whose text repeats under a different number', () => {
    expect(
      descriptions([
        {
          descriptor: 'Resíduos',
          items: [item('2.3', 'Portar o MTR'), item('2.7', 'Portar o MTR')],
        },
      ]),
    ).toEqual(['Portar o MTR', 'Portar o MTR']);
  });

  it('prefixes each sub-item with the text of its introductory ancestors', () => {
    expect(
      descriptions([
        {
          descriptor: 'Resíduos',
          items: [
            item('2.5', 'no caso de resíduos de saúde:'),
            item('2.5.1', 'o compartimento deve ser estanque,'),
            item('2.5.2', 'quanto à limpeza:'),
            item('2.5.2.1', 'higienizar o veículo.'),
            item('2.6', 'Manter o MTR.'),
          ],
        },
      ]),
    ).toEqual([
      'no caso de resíduos de saúde:',
      'No caso de resíduos de saúde: o compartimento deve ser estanque,',
      'No caso de resíduos de saúde: quanto à limpeza:',
      'No caso de resíduos de saúde: quanto à limpeza: higienizar o veículo.',
      'Manter o MTR.',
    ]);
  });

  it('does not add the parent text when the parent is a full obligation', () => {
    expect(
      descriptions([
        {
          descriptor: 'Resíduos',
          items: [
            item('2.3', 'Portar o MTR.'),
            item('2.3.1', 'No caso de embalagens vazias, portar o MTR.'),
          ],
        },
      ]),
    ).toEqual(['Portar o MTR.', 'No caso de embalagens vazias, portar o MTR.']);
  });

  it('treats a non-array section list as empty', () => {
    const result = parseLicenseExtraction(
      answer({ ...FULL_ANSWER, sections: 'none' }),
    );

    expect(result.suggestedConditions).toEqual([]);
  });

  it('never returns a periodicity on a non-periodic condition', () => {
    const result = parseLicenseExtraction(
      answer({
        extracted_data: EXTRACTED_DATA,
        sections: [
          {
            descriptor: null,
            items: [
              item('1', 'Informativa', { periodicity: 'ANNUAL' }),
              { number: '2', description: 'Sem tipo', periodicity: 'MONTHLY' },
              { number: '3', description: 'Inválida', periodicity: 'WEEKLY' },
            ],
          },
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

  it('truncates texts to the limits the registration form accepts, at a word boundary', () => {
    const result = parseLicenseExtraction(
      answer({
        extracted_data: EXTRACTED_DATA,
        sections: [
          {
            descriptor: 'b'.repeat(200),
            items: [item('1.1', 'palavra '.repeat(80))],
          },
        ],
      }),
    );
    const [condition] = result.suggestedConditions;

    expect(condition.description.length).toBeLessThanOrEqual(500);
    expect(condition.description).toMatch(/palavra…$/);
    expect(condition.environmentalDescriptor).toHaveLength(120);
  });

  it('caps the number of suggested conditions', () => {
    const result = parseLicenseExtraction(
      answer({
        extracted_data: EXTRACTED_DATA,
        sections: [
          {
            descriptor: null,
            items: Array.from({ length: 250 }, (_, index) =>
              item(`1.${index}`, `Item ${index}`),
            ),
          },
        ],
      }),
    );

    expect(result.suggestedConditions).toHaveLength(200);
  });

  it.each([
    ['an answer without JSON', 'Não consegui ler o documento.'],
    ['malformed JSON', '{"extracted_data": {'],
    [
      'a truncated answer',
      '{"extracted_data": {"type": "LO"}, "sections": [{"descriptor": "x"',
    ],
    ['a JSON without extracted_data', answer({ sections: [] })],
    ['a JSON array', '[1, 2]'],
  ])('rejects %s', (_label, text) => {
    expect(() => parseLicenseExtraction(text)).toThrow(
      UnreadableLicenseDocumentError,
    );
  });
});

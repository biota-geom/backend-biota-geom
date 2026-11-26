import {
  createDemoLicenseExtraction,
  DEMO_LICENSE_EXTRACTION_DELAY_MS,
  DEMO_LICENSE_FILE_NAME,
  isDemoLicenseFile,
} from './demo-license-extraction.fixture';

describe('demo-license-extraction.fixture', () => {
  it('matches only the exact demo PDF file name, including Multer Latin-1 and NFD encodings', () => {
    const latin1Mojibake = Buffer.from(DEMO_LICENSE_FILE_NAME, 'utf8').toString(
      'latin1',
    );
    const nfdNormalized = DEMO_LICENSE_FILE_NAME.normalize('NFD');

    expect(isDemoLicenseFile(DEMO_LICENSE_FILE_NAME)).toBe(true);
    expect(isDemoLicenseFile(latin1Mojibake)).toBe(true);
    expect(isDemoLicenseFile(nfdNormalized)).toBe(true);
  });

  it.each([
    undefined,
    '',
    'Exemplo Licença Ambiental de Transporte (2)',
    'Exemplo Licença Ambiental de Transporte.pdf',
    'exemplo licença ambiental de transporte (2).pdf',
    'Exemplo Licenca Ambiental de Transporte (2).pdf',
    'other-license.pdf',
  ])('rejects non-matching file name %p', (fileName) => {
    expect(isDemoLicenseFile(fileName)).toBe(false);
  });

  it('uses a 20-second delay and returns a fresh clone of the LU 00865 / 2022 extraction', () => {
    expect(DEMO_LICENSE_EXTRACTION_DELAY_MS).toBe(20_000);

    const first = createDemoLicenseExtraction();
    expect(first.extractedData).toEqual({
      type: 'LU',
      processNumber: 'LU Nº 00865 / 2022',
      issuingAgency: 'FEPAM',
      issueDate: '2022-04-28',
      expirationDate: '2027-04-29',
    });
    expect(first.suggestedConditions).toHaveLength(44);
    expect(first.suggestedLegislations).toHaveLength(11);

    const periodic = first.suggestedConditions.filter(
      (condition) => condition.conditionType === 'PERIODIC',
    );
    const informative = first.suggestedConditions.filter(
      (condition) => condition.conditionType === 'INFORMATIVE',
    );
    expect(periodic).toHaveLength(8);
    expect(informative).toHaveLength(36);
    expect(new Set(periodic.map((condition) => condition.periodicity))).toEqual(
      new Set(['MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL']),
    );
    expect(
      periodic.some(
        (condition) =>
          condition.description.includes('ART') &&
          condition.dueDate === '2027-04-29',
      ),
    ).toBe(true);
    expect(
      informative.every(
        (condition) =>
          condition.periodicity === null && condition.dueDate === null,
      ),
    ).toBe(true);

    first.extractedData.type = 'MUTATED';
    first.suggestedConditions.pop();

    const second = createDemoLicenseExtraction();
    expect(second.extractedData.type).toBe('LU');
    expect(second.suggestedConditions).toHaveLength(44);
  });
});

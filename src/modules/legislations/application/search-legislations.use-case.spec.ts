import { LegislationType } from '@prisma/client';
import { LegislationRepository } from '../domain/legislations.repository';
import { SearchLegislationsUseCase } from './search-legislations.use-case';

describe('SearchLegislationsUseCase', () => {
  it('searches the legislation catalog by the supplied term', async () => {
    const legislations = [
      {
        id: 'legislation-1',
        type: LegislationType.RESOLUCAO,
        number: '237',
        year: 1997,
        issuingBody: 'CONAMA',
        summary: 'Licenciamento ambiental.',
      },
    ];
    const findAllBySearch = jest.fn().mockResolvedValue(legislations);
    const useCase = new SearchLegislationsUseCase({
      findAllBySearch,
    } as unknown as LegislationRepository);

    await expect(useCase.execute('12.305')).resolves.toEqual([
      {
        id: 'legislation-1',
        type: 'RESOLUCAO',
        number: '237',
        year: 1997,
        issuing_body: 'CONAMA',
        summary: 'Licenciamento ambiental.',
      },
    ]);
    expect(findAllBySearch).toHaveBeenCalledWith('12.305');
  });
});

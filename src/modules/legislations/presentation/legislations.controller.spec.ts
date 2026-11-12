import { LegislationType } from '@prisma/client';
import { SearchLegislationsUseCase } from '../application/search-legislations.use-case';
import { LegislationsController } from './legislations.controller';

describe('LegislationsController', () => {
  it('returns catalog matches in the search response shape', async () => {
    const execute = jest.fn().mockResolvedValue([
      {
        id: 'legislation-1',
        type: LegislationType.RESOLUCAO,
        number: '237',
        year: 1997,
        issuing_body: 'CONAMA',
        summary: 'Licenciamento ambiental.',
      },
    ]);
    const controller = new LegislationsController({
      execute,
    } as unknown as SearchLegislationsUseCase);

    await expect(
      controller.searchLegislations({ search: '12.305' }),
    ).resolves.toEqual({
      legislations: [
        {
          id: 'legislation-1',
          type: 'RESOLUCAO',
          number: '237',
          year: 1997,
          issuing_body: 'CONAMA',
          summary: 'Licenciamento ambiental.',
        },
      ],
    });
    expect(execute).toHaveBeenCalledWith('12.305');
  });
});

import { ListSectorsUseCase } from '../application/list-sectors.use-case';
import { SectorsController } from './sectors.controller';

describe('SectorsController', () => {
  it('maps each sector onto the response shape', async () => {
    const useCase: Pick<ListSectorsUseCase, 'listSectors'> = {
      listSectors: jest.fn().mockResolvedValue([
        {
          id: 'sector-1',
          name: 'Agronegócio Sustentável',
          description: 'Produção agrícola com práticas ecológicas.',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'sector-2',
          name: 'Energia Renovável',
          description: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
    };
    const controller = new SectorsController(
      useCase as unknown as ListSectorsUseCase,
    );

    await expect(controller.listSectors()).resolves.toEqual([
      {
        id: 'sector-1',
        name: 'Agronegócio Sustentável',
        description: 'Produção agrícola com práticas ecológicas.',
      },
      { id: 'sector-2', name: 'Energia Renovável', description: null },
    ]);
  });
});

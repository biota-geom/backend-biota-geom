import { ListIssuingAgenciesUseCase } from '../application/list-issuing-agencies.use-case';
import { IssuingAgenciesController } from './issuing-agencies.controller';

describe('IssuingAgenciesController', () => {
  it('maps each issuing agency onto the response shape', async () => {
    const useCase: Pick<ListIssuingAgenciesUseCase, 'listIssuingAgencies'> = {
      listIssuingAgencies: jest.fn().mockResolvedValue([
        {
          id: 'agency-1',
          name: 'FEPAM',
          acronym: 'FEPAM',
          createdAt: new Date(),
        },
        { id: 'agency-2', name: 'IBAMA', acronym: null, createdAt: new Date() },
      ]),
    };
    const controller = new IssuingAgenciesController(
      useCase as unknown as ListIssuingAgenciesUseCase,
    );

    await expect(controller.listIssuingAgencies()).resolves.toEqual([
      { id: 'agency-1', name: 'FEPAM', acronym: 'FEPAM' },
      { id: 'agency-2', name: 'IBAMA', acronym: null },
    ]);
  });
});

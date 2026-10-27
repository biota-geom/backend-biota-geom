import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { AUTH_MESSAGES } from '../../auth/presentation/messages/auth.messages.pt-br';
import { GetEsgIndicatorsUseCase } from '../application/get-esg-indicators.use-case';
import { SaveEsgIndicatorsUseCase } from '../application/save-esg-indicators.use-case';
import { SaveEsgIndicatorsDto } from './dto/save-esg-indicators.dto';
import {
  EsgIndicatorsController,
  invalidCustomerIdException,
} from './esg-indicators.controller';

const STORED = [
  {
    id: 'ind-1',
    name: 'Consumo de Água',
    unit: 'm³',
    category: 'Ambiental',
    value: 1250.5,
  },
  {
    id: 'ind-2',
    name: 'Resíduos Totais',
    unit: 't',
    category: 'Ambiental',
    value: null,
  },
];
const RESPONSE = [
  {
    indicator_id: 'ind-1',
    name: 'Consumo de Água',
    unit: 'm³',
    category: 'Ambiental',
    value: 1250.5,
  },
  {
    indicator_id: 'ind-2',
    name: 'Resíduos Totais',
    unit: 't',
    category: 'Ambiental',
    value: null,
  },
];

function buildController() {
  const get = { execute: jest.fn().mockResolvedValue(STORED) };
  const save = { execute: jest.fn().mockResolvedValue(STORED) };
  const controller = new EsgIndicatorsController(
    get as unknown as GetEsgIndicatorsUseCase,
    save as unknown as SaveEsgIndicatorsUseCase,
  );

  return { controller, get, save };
}

describe('EsgIndicatorsController', () => {
  it('lists the month with the contract field names', async () => {
    const { controller, get } = buildController();

    await expect(
      controller.getIndicators('customer-1', '2026-09', { id: 'owner-1' }),
    ).resolves.toEqual(RESPONSE);

    expect(get.execute).toHaveBeenCalledWith(
      'customer-1',
      'owner-1',
      '2026-09',
    );
  });

  it('saves the month for the owner taken from the token', async () => {
    const { controller, save } = buildController();
    const dto = plainToInstance(SaveEsgIndicatorsDto, {
      records: [{ indicator_id: 'ind-1', value: 1250.5 }],
    });

    await expect(
      controller.saveIndicators('customer-1', '2026-09', dto, {
        id: 'owner-1',
      }),
    ).resolves.toEqual(RESPONSE);

    expect(save.execute).toHaveBeenCalledWith({
      customerId: 'customer-1',
      ownerUserId: 'owner-1',
      month: '2026-09',
      records: [{ indicatorId: 'ind-1', value: 1250.5 }],
    });
  });

  it('answers a malformed customer id with a generic 400', () => {
    const error = invalidCustomerIdException();

    expect(error).toBeInstanceOf(BadRequestException);
    expect(error.message).toBe(AUTH_MESSAGES.INVALID_REQUEST);
  });
});

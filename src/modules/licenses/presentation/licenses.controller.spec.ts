import {
  ConditionStatus,
  ConditionType,
  LicenseStatus,
  LicenseType,
} from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { AUTH_MESSAGES } from '../../auth/presentation/messages/auth.messages.pt-br';
import { CreateLicenseUseCase } from '../application/create-license.use-case';
import {
  fileValidationExceptionFactory,
  invalidCustomerIdException,
  LicensesController,
} from './licenses.controller';
import { LICENSES_MESSAGES } from './messages/licenses.messages.pt-br';
import { UpdateLicenseConditionDto } from './dto/update-license-condition.dto';

describe('invalidCustomerIdException', () => {
  it('answers 400 with the generic invalid-request message', () => {
    const exception = invalidCustomerIdException();

    expect(exception.getStatus()).toBe(400);
    expect(exception.message).toBe(AUTH_MESSAGES.INVALID_REQUEST);
  });
});

describe('fileValidationExceptionFactory', () => {
  it.each([
    LICENSES_MESSAGES.FILE_TOO_LARGE,
    LICENSES_MESSAGES.INVALID_FILE_TYPE,
  ])('passes our own message "%s" through as a 422', (message) => {
    const exception = fileValidationExceptionFactory(message);

    expect(exception.getStatus()).toBe(422);
    expect(exception.message).toBe(message);
  });

  it("replaces Nest's English default with the PT-BR file-required message", () => {
    const exception = fileValidationExceptionFactory('File is required');

    expect(exception.getStatus()).toBe(422);
    expect(exception.message).toBe(LICENSES_MESSAGES.FILE_REQUIRED);
  });
});

describe('LicensesController', () => {
  function buildFile(): Express.Multer.File {
    return {
      buffer: Buffer.from('%PDF-1.4'),
      originalname: 'licenca.pdf',
      mimetype: 'application/pdf',
    } as Express.Multer.File;
  }

  it('forwards the parsed dto, file and authenticated user to the use case', async () => {
    const execute = jest.fn().mockResolvedValue({
      id: 'license-1',
      customerId: 'customer-1',
      type: LicenseType.LO,
      processNumber: 'LO nº 118/2020',
      issuingAgencyId: 'agency-1',
      issuingAgency: {
        id: 'agency-1',
        name: 'FEPAM',
        acronym: 'FEPAM',
        createdAt: new Date(),
      },
      issueDate: new Date('2020-01-10T00:00:00.000Z'),
      expirationDate: new Date('2025-01-10T00:00:00.000Z'),
      status: LicenseStatus.EXPIRED,
      documentUrl: 'https://bucket.aws.com/licenses/lo-118-2020.pdf',
      createdAt: new Date('2020-01-10T00:00:00.000Z'),
      updatedAt: new Date('2020-01-10T00:00:00.000Z'),
    });
    const controller = new LicensesController(
      { execute } as unknown as CreateLicenseUseCase,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const response = await controller.createLicense(
      'customer-1',
      {
        type: LicenseType.LO,
        process_number: 'LO nº 118/2020',
        issuing_agency_id: 'agency-1',
        issue_date: '2020-01-10T00:00:00.000Z',
        expiration_date: '2025-01-10T00:00:00.000Z',
      },
      buildFile(),
      { id: 'owner-1' },
    );

    expect(execute).toHaveBeenCalledWith({
      customerId: 'customer-1',
      ownerUserId: 'owner-1',
      type: LicenseType.LO,
      processNumber: 'LO nº 118/2020',
      issuingAgencyId: 'agency-1',
      issueDate: new Date('2020-01-10T00:00:00.000Z'),
      expirationDate: new Date('2025-01-10T00:00:00.000Z'),
      file: {
        buffer: Buffer.from('%PDF-1.4'),
        originalName: 'licenca.pdf',
        mimeType: 'application/pdf',
      },
    });
    expect(response).toEqual(
      expect.objectContaining({ id: 'license-1', status: 'Vencida' }),
    );
  });

  it('returns the license details in the public API shape', async () => {
    const execute = jest.fn().mockResolvedValue({
      id: 'license-1',
      processNumber: 'LP nº 482/2024',
      issueDate: new Date('2024-03-12T00:00:00.000Z'),
      expirationDate: new Date('2026-03-12T00:00:00.000Z'),
      status: LicenseStatus.REGULAR,
      conditions: [
        {
          id: 'condition-1',
          itemNumber: '1.1',
          description: 'Refere-se à atividade de estacionamento...',
          conditionType: ConditionType.INFORMATIVE,
          periodicity: null,
          deadline: null,
          status: ConditionStatus.FULFILLED,
          completionDate: new Date('2024-03-12T00:00:00.000Z'),
          responsibleName: 'Lucas Silva',
        },
      ],
    });
    const controller = new LicensesController(
      {} as never,
      {} as never,
      { execute } as never,
      {} as never,
      {} as never,
    );

    await expect(
      controller.getLicenseDetails('customer-1', 'license-1', {
        id: 'owner-1',
      }),
    ).resolves.toEqual({
      id: 'license-1',
      process_number: 'LP nº 482/2024',
      issue_date: '2024-03-12T00:00:00.000Z',
      expiration_date: '2026-03-12T00:00:00.000Z',
      status: 'Regular',
      conditions: [
        {
          id: 'condition-1',
          item_number: '1.1',
          description: 'Refere-se à atividade de estacionamento...',
          condition_type: 'Informativo',
          periodicity: 'NA',
          deadline: null,
          status: 'Atendida',
          completion_date: '2024-03-12T00:00:00.000Z',
          responsible_name: 'Lucas Silva',
          is_violated: false,
        },
      ],
    });
    expect(execute).toHaveBeenCalledWith('customer-1', 'license-1', 'owner-1');
  });

  it('deletes a condition without returning a response body', async () => {
    const execute = jest.fn().mockResolvedValue(undefined);
    const controller = new LicensesController(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { execute } as never,
    );

    await expect(
      controller.deleteLicenseCondition(
        'customer-1',
        'license-1',
        'condition-1',
        { id: 'owner-1' },
      ),
    ).resolves.toBeUndefined();
    expect(execute).toHaveBeenCalledWith(
      'customer-1',
      'license-1',
      'condition-1',
      'owner-1',
    );
  });

  it('accepts and maps the documented update body', async () => {
    const dto = plainToInstance(UpdateLicenseConditionDto, {
      item_number: '1.1',
      description: 'Nova descrição corrigida...',
      condition_type: 'Informativo',
      periodicity: 'NA',
      status: 'Atendida',
      completion_date: '2024-03-15T00:00:00.000Z',
      is_violated: false,
    });
    expect(validateSync(dto)).toHaveLength(0);

    const updatedCondition = {
      id: 'condition-1',
      itemNumber: '1.1',
      description: 'Nova descrição corrigida...',
      conditionType: ConditionType.INFORMATIVE,
      periodicity: null,
      deadline: null,
      status: ConditionStatus.FULFILLED,
      completionDate: new Date('2024-03-15T00:00:00.000Z'),
      responsibleName: 'Lucas Silva',
    };
    const execute = jest.fn().mockResolvedValue(updatedCondition);
    const controller = new LicensesController(
      {} as never,
      {} as never,
      {} as never,
      { execute } as never,
      {} as never,
    );

    await expect(
      controller.updateLicenseCondition(
        'customer-1',
        'license-1',
        'condition-1',
        dto,
        { id: 'owner-1' },
      ),
    ).resolves.toEqual({
      id: 'condition-1',
      item_number: '1.1',
      description: 'Nova descrição corrigida...',
      condition_type: 'Informativo',
      periodicity: 'NA',
      deadline: null,
      status: 'Atendida',
      completion_date: '2024-03-15T00:00:00.000Z',
      responsible_name: 'Lucas Silva',
      is_violated: false,
    });
    expect(execute).toHaveBeenCalledWith({
      customerId: 'customer-1',
      licenseId: 'license-1',
      conditionId: 'condition-1',
      ownerUserId: 'owner-1',
      data: {
        itemNumber: '1.1',
        title: undefined,
        description: 'Nova descrição corrigida...',
        responsibleName: undefined,
        conditionType: ConditionType.INFORMATIVE,
        periodicity: null,
        deadline: undefined,
        dueDate: undefined,
        alertDate: undefined,
        completionDate: new Date('2024-03-15T00:00:00.000Z'),
        status: ConditionStatus.FULFILLED,
      },
    });
  });
});

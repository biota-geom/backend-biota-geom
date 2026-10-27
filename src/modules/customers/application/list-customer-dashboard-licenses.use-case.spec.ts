import { LicenseStatus, LicenseType } from '@prisma/client';
import { LicenseRepository } from '../../licenses/domain/licenses.repository';
import { License } from '../../licenses/domain/license.entity';
import { CustomerRepository } from '../domain/customers.repository';
import { CustomerNotFoundError } from '../domain/errors/customer-not-found.error';
import { ListCustomerDashboardLicensesUseCase } from './list-customer-dashboard-licenses.use-case';

const CUSTOMER_ID = 'customer-1';
const USER_ID = 'user-1';

function buildLicense(
  id: string,
  expirationDate: string,
): License & { conditions: [] } {
  return {
    id,
    customerId: CUSTOMER_ID,
    type: LicenseType.LO,
    processNumber: `LO ${id}`,
    issuingAgencyId: 'agency-1',
    issueDate: new Date('2020-01-01T00:00:00.000Z'),
    expirationDate: new Date(expirationDate),
    status: LicenseStatus.REGULAR,
    documentUrl: '',
    createdAt: new Date('2020-01-01T00:00:00.000Z'),
    updatedAt: new Date('2020-01-01T00:00:00.000Z'),
    conditions: [],
  };
}

describe('ListCustomerDashboardLicensesUseCase', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function buildUseCase(licenses: Array<License & { conditions: [] }>) {
    const findOne = jest.fn().mockResolvedValue({ id: CUSTOMER_ID });
    const findCustomerLicenses = jest.fn().mockResolvedValue(licenses);
    const useCase = new ListCustomerDashboardLicensesUseCase(
      { findCustomerLicenses } as unknown as LicenseRepository,
      { findOne } as unknown as CustomerRepository,
    );

    return { useCase, findOne, findCustomerLicenses };
  }

  it('returns counts and only the three most critical licenses', async () => {
    const { useCase, findOne, findCustomerLicenses } = buildUseCase([
      buildLicense('regular', '2026-03-01T00:00:00.000Z'),
      buildLicense('attention-later', '2026-01-03T00:00:00.000Z'),
      buildLicense('expired-later', '2025-12-30T00:00:00.000Z'),
      buildLicense('attention-sooner', '2026-01-02T00:00:00.000Z'),
      buildLicense('expired-sooner', '2025-12-20T00:00:00.000Z'),
    ]);

    await expect(useCase.execute(CUSTOMER_ID, USER_ID)).resolves.toEqual({
      header: {
        active_licenses: 5,
        pending_items: 4,
      },
      counts: {
        regular: 1,
        pending: 2,
        expired: 2,
      },
      critical: [
        {
          id: 'expired-sooner',
          type: LicenseType.LO,
          process_number: 'LO expired-sooner',
          expiration_date: '2025-12-20',
          status: 'Vencida',
        },
        {
          id: 'expired-later',
          type: LicenseType.LO,
          process_number: 'LO expired-later',
          expiration_date: '2025-12-30',
          status: 'Vencida',
        },
        {
          id: 'attention-sooner',
          type: LicenseType.LO,
          process_number: 'LO attention-sooner',
          expiration_date: '2026-01-02',
          status: 'Atenção',
        },
      ],
    });
    expect(findOne).toHaveBeenCalledWith(CUSTOMER_ID, USER_ID);
    expect(findCustomerLicenses).toHaveBeenCalledWith(CUSTOMER_ID);
  });

  it('returns zero counts and no critical licenses when the customer has no licenses', async () => {
    const { useCase } = buildUseCase([]);

    await expect(useCase.execute(CUSTOMER_ID, USER_ID)).resolves.toEqual({
      header: {
        active_licenses: 0,
        pending_items: 0,
      },
      counts: {
        regular: 0,
        pending: 0,
        expired: 0,
      },
      critical: [],
    });
  });

  it('throws when the customer does not exist for the user', async () => {
    const findOne = jest.fn().mockResolvedValue(null);
    const findCustomerLicenses = jest.fn();
    const useCase = new ListCustomerDashboardLicensesUseCase(
      { findCustomerLicenses } as unknown as LicenseRepository,
      { findOne } as unknown as CustomerRepository,
    );

    await expect(useCase.execute(CUSTOMER_ID, USER_ID)).rejects.toThrow(
      CustomerNotFoundError,
    );
    expect(findCustomerLicenses).not.toHaveBeenCalled();
  });
});

import { LicenseStatus } from '@prisma/client';
import { CustomerRepository } from '../../customers/domain/customers.repository';
import { CustomerNotFoundError } from '../../customers/domain/errors/customer-not-found.error';
import { LicenseRepository } from '../domain/licenses.repository';
import { LicenseNotFoundError } from '../domain/errors/license-not-found.error';
import { GetLicenseDetailsUseCase } from './get-license-details.use-case';

describe('GetLicenseDetailsUseCase', () => {
  const license = {
    id: 'license-1',
    status: LicenseStatus.REGULAR,
    expirationDate: new Date('2030-01-01T00:00:00.000Z'),
    conditions: [],
  };

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the customer license details', async () => {
    const findByIdForCustomer = jest.fn().mockResolvedValue(license);
    const useCase = new GetLicenseDetailsUseCase(
      { findByIdForCustomer } as unknown as LicenseRepository,
      {
        findOne: jest.fn().mockResolvedValue({ id: 'customer-1' }),
      } as unknown as CustomerRepository,
    );

    await expect(
      useCase.execute('customer-1', 'license-1', 'owner-1'),
    ).resolves.toEqual(license);
    expect(findByIdForCustomer).toHaveBeenCalledWith('license-1', 'customer-1');
  });

  it('re-derives a stored status that went stale', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2030-06-01T00:00:00.000Z'));
    const useCase = new GetLicenseDetailsUseCase(
      {
        findByIdForCustomer: jest.fn().mockResolvedValue(license),
      } as unknown as LicenseRepository,
      {
        findOne: jest.fn().mockResolvedValue({ id: 'customer-1' }),
      } as unknown as CustomerRepository,
    );

    await expect(
      useCase.execute('customer-1', 'license-1', 'owner-1'),
    ).resolves.toEqual({ ...license, status: LicenseStatus.EXPIRED });
  });

  it('keeps an archived license archived', async () => {
    const archived = { ...license, status: LicenseStatus.ARCHIVED };
    const useCase = new GetLicenseDetailsUseCase(
      {
        findByIdForCustomer: jest.fn().mockResolvedValue(archived),
      } as unknown as LicenseRepository,
      {
        findOne: jest.fn().mockResolvedValue({ id: 'customer-1' }),
      } as unknown as CustomerRepository,
    );

    await expect(
      useCase.execute('customer-1', 'license-1', 'owner-1'),
    ).resolves.toEqual(archived);
  });

  it('rejects an unknown customer before querying the license', async () => {
    const findByIdForCustomer = jest.fn();
    const useCase = new GetLicenseDetailsUseCase(
      { findByIdForCustomer } as unknown as LicenseRepository,
      {
        findOne: jest.fn().mockResolvedValue(null),
      } as unknown as CustomerRepository,
    );

    await expect(
      useCase.execute('customer-1', 'license-1', 'owner-1'),
    ).rejects.toThrow(CustomerNotFoundError);
    expect(findByIdForCustomer).not.toHaveBeenCalled();
  });

  it('rejects a license that is not owned by the customer', async () => {
    const useCase = new GetLicenseDetailsUseCase(
      {
        findByIdForCustomer: jest.fn().mockResolvedValue(null),
      } as unknown as LicenseRepository,
      {
        findOne: jest.fn().mockResolvedValue({ id: 'customer-1' }),
      } as unknown as CustomerRepository,
    );

    await expect(
      useCase.execute('customer-1', 'license-1', 'owner-1'),
    ).rejects.toThrow(LicenseNotFoundError);
  });
});

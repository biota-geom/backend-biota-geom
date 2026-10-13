import { CustomerRepository } from '../../customers/domain/customers.repository';
import { CustomerNotFoundError } from '../../customers/domain/errors/customer-not-found.error';
import { LicenseConditionLicenseMismatchError } from '../domain/errors/license-condition-license-mismatch.error';
import { LicenseNotFoundError } from '../domain/errors/license-not-found.error';
import { LicenseRepository } from '../domain/licenses.repository';
import { SaveConditionsFulfillmentUseCase } from './save-conditions-fulfillment.use-case';

const CUSTOMER_ID = 'customer-1';
const LICENSE_ID = 'license-1';
const OWNER_ID = 'owner-1';

const CONDITION_A = 'cond-a';
const CONDITION_B = 'cond-b';

const MOCK_LICENSE = {
  id: LICENSE_ID,
  conditions: [{ id: CONDITION_A }, { id: CONDITION_B }],
};

describe('SaveConditionsFulfillmentUseCase', () => {
  function buildUseCase(overrides?: {
    findOne?: jest.Mock;
    findByIdForCustomer?: jest.Mock;
    saveConditionsFulfillment?: jest.Mock;
  }) {
    const findOne =
      overrides?.findOne ?? jest.fn().mockResolvedValue({ id: CUSTOMER_ID });
    const findByIdForCustomer =
      overrides?.findByIdForCustomer ??
      jest.fn().mockResolvedValue(MOCK_LICENSE);
    const saveConditionsFulfillment =
      overrides?.saveConditionsFulfillment ??
      jest.fn().mockResolvedValue(undefined);

    const licenseRepository = {
      findByIdForCustomer,
      saveConditionsFulfillment,
    } as unknown as LicenseRepository;

    const customerRepository = { findOne } as unknown as CustomerRepository;

    return {
      useCase: new SaveConditionsFulfillmentUseCase(
        licenseRepository,
        customerRepository,
      ),
      findOne,
      findByIdForCustomer,
      saveConditionsFulfillment,
    };
  }

  it('validates ownership and saves fulfillment for all items', async () => {
    const { useCase, saveConditionsFulfillment } = buildUseCase();

    const items = [
      { conditionId: CONDITION_A, fulfilled: true },
      { conditionId: CONDITION_B, fulfilled: false },
    ];

    await expect(
      useCase.execute(CUSTOMER_ID, LICENSE_ID, OWNER_ID, items),
    ).resolves.toBeUndefined();

    expect(saveConditionsFulfillment).toHaveBeenCalledWith({
      licenseId: LICENSE_ID,
      customerId: CUSTOMER_ID,
      items,
    });
  });

  it('rejects when customer is not found', async () => {
    const { useCase, saveConditionsFulfillment } = buildUseCase({
      findOne: jest.fn().mockResolvedValue(null),
    });

    await expect(
      useCase.execute(CUSTOMER_ID, LICENSE_ID, OWNER_ID, [
        { conditionId: CONDITION_A, fulfilled: true },
      ]),
    ).rejects.toThrow(CustomerNotFoundError);

    expect(saveConditionsFulfillment).not.toHaveBeenCalled();
  });

  it('rejects when license is not found or does not belong to the company', async () => {
    const { useCase, saveConditionsFulfillment } = buildUseCase({
      findByIdForCustomer: jest.fn().mockResolvedValue(null),
    });

    await expect(
      useCase.execute(CUSTOMER_ID, LICENSE_ID, OWNER_ID, [
        { conditionId: CONDITION_A, fulfilled: true },
      ]),
    ).rejects.toThrow(LicenseNotFoundError);

    expect(saveConditionsFulfillment).not.toHaveBeenCalled();
  });

  it('rejects when a condition_id does not belong to the license', async () => {
    const { useCase, saveConditionsFulfillment } = buildUseCase();

    await expect(
      useCase.execute(CUSTOMER_ID, LICENSE_ID, OWNER_ID, [
        { conditionId: 'foreign-condition', fulfilled: true },
      ]),
    ).rejects.toThrow(LicenseConditionLicenseMismatchError);

    expect(saveConditionsFulfillment).not.toHaveBeenCalled();
  });

  it('rejects when even one condition_id in a mixed list is foreign', async () => {
    const { useCase, saveConditionsFulfillment } = buildUseCase();

    await expect(
      useCase.execute(CUSTOMER_ID, LICENSE_ID, OWNER_ID, [
        { conditionId: CONDITION_A, fulfilled: true },
        { conditionId: 'foreign-condition', fulfilled: false },
      ]),
    ).rejects.toThrow(LicenseConditionLicenseMismatchError);

    expect(saveConditionsFulfillment).not.toHaveBeenCalled();
  });
});

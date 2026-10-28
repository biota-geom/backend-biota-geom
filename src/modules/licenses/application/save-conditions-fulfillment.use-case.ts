import { Injectable } from '@nestjs/common';
import { CustomerRepository } from '../../customers/domain/customers.repository';
import { CustomerNotFoundError } from '../../customers/domain/errors/customer-not-found.error';
import { LicenseConditionLicenseMismatchError } from '../domain/errors/license-condition-license-mismatch.error';
import { LicenseNotFoundError } from '../domain/errors/license-not-found.error';
import { ConditionFulfillmentItem } from '../domain/save-conditions-fulfillment.data';
import { LicenseRepository } from '../domain/licenses.repository';

@Injectable()
export class SaveConditionsFulfillmentUseCase {
  constructor(
    private readonly licenseRepository: LicenseRepository,
    private readonly customerRepository: CustomerRepository,
  ) {}

  async execute(
    customerId: string,
    licenseId: string,
    ownerUserId: string,
    items: ConditionFulfillmentItem[],
  ): Promise<void> {
    // 1. Validate company belongs to the logged-in user
    const customer = await this.customerRepository.findOne(
      customerId,
      ownerUserId,
    );
    if (!customer) throw new CustomerNotFoundError(customerId);

    // 2. Validate license belongs to the company — and fetch its conditions
    const license = await this.licenseRepository.findByIdForCustomer(
      licenseId,
      customerId,
    );
    if (!license) throw new LicenseNotFoundError(licenseId);

    // 3. Validate all condition_ids belong to this license
    const validIds = new Set(license.conditions.map((c) => c.id));
    const invalidItem = items.find((item) => !validIds.has(item.conditionId));
    if (invalidItem) throw new LicenseConditionLicenseMismatchError();

    // 4. Persist fulfillment
    await this.licenseRepository.saveConditionsFulfillment({
      licenseId,
      customerId,
      items,
    });
  }
}

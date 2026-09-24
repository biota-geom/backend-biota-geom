import { Injectable } from '@nestjs/common';
import { CreateCustomerData } from './create-customer.data';
import { Customer } from './customer.entity';
import { CustomerListItem } from './customer-list-item';
import type { UpdateCustomerData } from './update-customer.data';

/*
 * Multi-tenant boundary (US10). Every method is scoped to the owning User —
 * the consultancy that registered the company — and that owner is a required
 * argument, not an optional filter, so the type checker refuses any call site
 * that forgets it.
 *
 * The scope lives here, in the query, rather than in the use cases: a "load
 * the row, then compare its owner" check in the application layer would still
 * have read another tenant's data, and every future call path would have to
 * remember to repeat the comparison. A query that cannot return a foreign row
 * has nothing to remember.
 *
 * Consequence, on purpose: a customer that belongs to someone else reads as
 * "not found" (null / false), never as "forbidden". Answering 403 would
 * confirm that the id exists and let a client enumerate other tenants' ids.
 */
@Injectable()
export abstract class CustomerRepository {
  abstract findAll(ownerUserId: string): Promise<CustomerListItem[]>;
  abstract create(data: CreateCustomerData): Promise<Customer>;
  abstract findById(id: string, ownerUserId: string): Promise<Customer | null>;
  abstract findOne(id: string, ownerUserId: string): Promise<Customer | null>;
  abstract update(
    id: string,
    ownerUserId: string,
    data: UpdateCustomerData,
  ): Promise<Customer>;
  abstract remove(id: string, ownerUserId: string): Promise<boolean>;
}

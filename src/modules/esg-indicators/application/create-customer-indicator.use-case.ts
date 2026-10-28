import { Injectable } from '@nestjs/common';
import { CustomerRepository } from '../../customers/domain/customers.repository';
import { CustomerNotFoundError } from '../../customers/domain/errors/customer-not-found.error';
import { CustomerIndicatorRepository } from '../domain/customer-indicators.repository';
import { IndicatorAlreadyExistsError } from '../domain/errors/indicator-already-exists.error';
import { IndicatorDefinition, NewIndicator } from '../domain/esg-indicator';

export interface CreateCustomerIndicatorInput extends NewIndicator {
  customerId: string;
  ownerUserId: string;
}

const sameName = (a: string, b: string) =>
  a.trim().toLocaleLowerCase('pt-BR') === b.trim().toLocaleLowerCase('pt-BR');

@Injectable()
export class CreateCustomerIndicatorUseCase {
  constructor(
    private readonly customerIndicatorRepository: CustomerIndicatorRepository,
    private readonly customerRepository: CustomerRepository,
  ) {}

  async execute(
    input: CreateCustomerIndicatorInput,
  ): Promise<IndicatorDefinition> {
    const customer = await this.customerRepository.findOne(
      input.customerId,
      input.ownerUserId,
    );
    if (!customer) {
      throw new CustomerNotFoundError(input.customerId);
    }

    // Duplicates are checked per customer, not across the whole account.
    const active = await this.customerIndicatorRepository.findActive(
      input.customerId,
    );
    if (active.some((indicator) => sameName(indicator.name, input.name))) {
      throw new IndicatorAlreadyExistsError(input.name);
    }

    // The account may already have an entry with this name (created for
    // another customer, or a global one): reuse it instead of duplicating it.
    const existing = await this.customerIndicatorRepository.findInCatalogByName(
      input.ownerUserId,
      input.name,
    );
    if (existing) {
      await this.customerIndicatorRepository.link(
        input.customerId,
        existing.id,
      );
      return existing;
    }

    return this.customerIndicatorRepository.createAndLink(
      input.customerId,
      input.ownerUserId,
      { name: input.name, unit: input.unit, category: input.category },
    );
  }
}

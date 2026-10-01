import { CustomerEsgMetricRepository } from '../../customers/domain/customer-esg-metric.repository';
import { EsgMetricRepository } from '../../esg-metrics/domain/repositories/esg-metric.repository';
import { ConditionCategoryNotFoundError } from '../domain/errors/condition-category-not-found.error';
import { ConditionCategoryNotLinkedError } from '../domain/errors/condition-category-not-linked.error';

export interface ConditionCategoryRepositories {
  esgMetricRepository: EsgMetricRepository;
  customerEsgMetricRepository: CustomerEsgMetricRepository;
}

/*
 * A condition's category must be one of the GRI parameters linked to the
 * license's customer (US02). A parameter that does not exist and a custom
 * parameter owned by another account are indistinguishable (not found), so
 * other tenants' private parameters are never revealed; a visible parameter
 * that is simply not linked to this customer is a distinct, reportable case.
 */
export async function assertConditionCategoriesLinked(
  repositories: ConditionCategoryRepositories,
  esgMetricIds: string[],
  customerId: string,
  ownerUserId: string,
): Promise<void> {
  const uniqueIds = [...new Set(esgMetricIds)];

  const metrics = await repositories.esgMetricRepository.findByIds(uniqueIds);
  const visibleIds = new Set(
    metrics
      .filter(
        (metric) =>
          metric.customerId === null || metric.customerId === ownerUserId,
      )
      .map((metric) => metric.id),
  );
  const notFoundId = uniqueIds.find((id) => !visibleIds.has(id));
  if (notFoundId !== undefined) {
    throw new ConditionCategoryNotFoundError(notFoundId);
  }

  const linkedIds = new Set(
    await repositories.customerEsgMetricRepository.findLinkedMetricIds(
      customerId,
      uniqueIds,
    ),
  );
  const notLinkedId = uniqueIds.find((id) => !linkedIds.has(id));
  if (notLinkedId !== undefined) {
    throw new ConditionCategoryNotLinkedError(notLinkedId);
  }
}

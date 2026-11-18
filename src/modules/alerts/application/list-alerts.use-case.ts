import { Injectable } from '@nestjs/common';
import { ListAlertsQuery } from '../domain/alert.entity';
import { AlertsRepository } from '../domain/alerts.repository';

@Injectable()
export class ListAlertsUseCase {
  constructor(private readonly repository: AlertsRepository) {}

  execute(ownerUserId: string, query: ListAlertsQuery) {
    return this.repository.list(ownerUserId, query);
  }
}

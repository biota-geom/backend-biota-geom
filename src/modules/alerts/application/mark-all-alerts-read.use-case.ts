import { Injectable } from '@nestjs/common';
import { AlertsRepository } from '../domain/alerts.repository';

@Injectable()
export class MarkAllAlertsReadUseCase {
  constructor(private readonly repository: AlertsRepository) {}

  async execute(ownerUserId: string, customerId?: string) {
    return {
      updated: await this.repository.markAllRead(ownerUserId, customerId),
    };
  }
}

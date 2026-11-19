import { Injectable } from '@nestjs/common';
import { AlertsRepository } from '../domain/alerts.repository';

@Injectable()
export class CountUnreadAlertsUseCase {
  constructor(private readonly repository: AlertsRepository) {}

  async execute(ownerUserId: string) {
    return { count: await this.repository.countUnread(ownerUserId) };
  }
}

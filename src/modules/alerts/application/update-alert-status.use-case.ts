import { Injectable } from '@nestjs/common';
import { AlertStatus } from '../domain/alert.entity';
import { AlertsRepository } from '../domain/alerts.repository';
import { AlertNotFoundError } from '../domain/errors/alert-not-found.error';

@Injectable()
export class UpdateAlertStatusUseCase {
  constructor(private readonly repository: AlertsRepository) {}

  async execute(
    ownerUserId: string,
    id: string,
    status: Exclude<AlertStatus, 'OPEN'>,
  ) {
    const alert = await this.repository.updateStatus(ownerUserId, id, status);
    if (!alert) throw new AlertNotFoundError();
    return alert;
  }
}

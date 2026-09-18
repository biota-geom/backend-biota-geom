import { Injectable } from '@nestjs/common';
import { IssuingAgency } from '../domain/issuing-agency.entity';
import { IssuingAgencyRepository } from '../domain/issuing-agencies.repository';

@Injectable()
export class ListIssuingAgenciesUseCase {
  constructor(private readonly repository: IssuingAgencyRepository) {}

  async listIssuingAgencies(): Promise<IssuingAgency[]> {
    return this.repository.findAll();
  }
}

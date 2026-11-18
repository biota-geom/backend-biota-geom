import { Injectable } from '@nestjs/common';
import { Legislation } from '../domain/legislation.entity';
import { LegislationRepository } from '../domain/legislations.repository';

@Injectable()
export class SearchLegislationsUseCase {
  constructor(private readonly legislationRepository: LegislationRepository) {}

  execute(search: string): Promise<Legislation[]> {
    return this.legislationRepository.findAllBySearch(search);
  }
}

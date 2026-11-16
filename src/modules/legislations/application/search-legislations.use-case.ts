import { Injectable } from '@nestjs/common';
import { LegislationRepository } from '../domain/legislations.repository';
import { LegislationResponseDto } from '../presentation/dto/legislation-response.dto';

@Injectable()
export class SearchLegislationsUseCase {
  constructor(private readonly legislationRepository: LegislationRepository) {}

  async execute(search: string): Promise<LegislationResponseDto[]> {
    const legislations =
      await this.legislationRepository.findAllBySearch(search);
    return legislations.map((legislation) => ({
      id: legislation.id,
      type: legislation.type,
      number: legislation.number,
      year: legislation.year,
      issuing_body: legislation.issuingBody,
      summary: legislation.summary,
    }));
  }
}

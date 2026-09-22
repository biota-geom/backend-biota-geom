import { Injectable } from '@nestjs/common';
import { IssuingAgency } from './issuing-agency.entity';

@Injectable()
export abstract class IssuingAgencyRepository {
  abstract findAll(): Promise<IssuingAgency[]>;

  abstract existsById(id: string): Promise<boolean>;
}

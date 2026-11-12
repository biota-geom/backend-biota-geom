import { Injectable } from '@nestjs/common';
import { CreateLegislationData, LegislationIdentity } from './legislation.data';
import { Legislation } from './legislation.entity';

@Injectable()
export abstract class LegislationRepository {
  abstract findById(id: string): Promise<Legislation | null>;
  abstract findByIdentity(
    identity: LegislationIdentity,
  ): Promise<Legislation | null>;
  /** Returns the existing act for the (type, number, year) identity, creating it when missing. */
  abstract findOrCreate(data: CreateLegislationData): Promise<Legislation>;
  abstract update(
    id: string,
    data: CreateLegislationData,
  ): Promise<Legislation>;
}

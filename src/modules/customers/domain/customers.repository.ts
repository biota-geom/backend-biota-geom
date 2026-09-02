import { Injectable } from '@nestjs/common';

export interface CustomerWithRelations {
  id: string;
  name: string;
  isActive: boolean;
  address: {
    city: string;
    state: string;
  } | null;
  sector: {
    name: string;
  } | null;
}

@Injectable()
export abstract class CustomerRepository {
  abstract findAll(): Promise<CustomerWithRelations[]>;
}

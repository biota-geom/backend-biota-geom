import { Customer } from '../../customers/domain/customer.entity';

export interface Sector {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  customers?: Customer[];
}

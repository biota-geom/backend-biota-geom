import { LegislationType } from '@prisma/client';

export interface Legislation {
  id: string;
  type: LegislationType;
  number: string;
  year: number;
  issuingBody: string;
  summary: string | null;
  createdAt: Date;
  updatedAt: Date;
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateLicenseData } from '../domain/create-license.data';
import { License } from '../domain/license.entity';
import { LicenseRepository } from '../domain/licenses.repository';

@Injectable()
export class PrismaLicenseRepository implements LicenseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateLicenseData): Promise<License> {
    return this.prisma.license.create({
      data: {
        customer: { connect: { id: data.customerId } },
        type: data.type,
        processNumber: data.processNumber,
        issuingAgency: { connect: { id: data.issuingAgencyId } },
        issueDate: data.issueDate,
        expirationDate: data.expirationDate,
        status: data.status,
        documentUrl: data.documentUrl,
      },
      include: {
        issuingAgency: true,
      },
    });
  }

  async findAllByCustomerId(customerId: string): Promise<License[]> {
    /*
     * Criticality ordering rule (US20):
     *   1. EXPIRED   — licenses that have already expired
     *   2. ATTENTION — licenses expiring within the attention window
     *   3. REGULAR   — all remaining licenses
     * Within each criticality group, the soonest-expiring license comes first
     * (ascending expirationDate), so the most urgent item always leads.
     *
     * Prisma's `orderBy` accepts a list; the CASE rank is expressed via a
     * secondary sort on the `status` field — but since Prisma can't express
     * a custom enum sort order through the managed query builder alone, we
     * emit a raw-SQL query that adds an inline CASE column for the rank.
     * The result type is explicitly cast back to License[] so the rest of
     * the application never sees the extra rank column.
     */
    return this.prisma.$queryRaw<License[]>`
      SELECT
        l.id,
        l.customer_id       AS "customerId",
        l.type,
        l.process_number    AS "processNumber",
        l.issuing_agency_id AS "issuingAgencyId",
        l.issue_date        AS "issueDate",
        l.expiration_date   AS "expirationDate",
        l.status,
        l.document_url      AS "documentUrl",
        l.created_at        AS "createdAt",
        l.updated_at        AS "updatedAt",
        CASE WHEN ia.id IS NOT NULL
          THEN json_build_object(
            'id', ia.id,
            'name', ia.name,
            'acronym', ia.acronym,
            'createdAt', ia.created_at
          )
          ELSE NULL
        END AS "issuingAgency"
      FROM licenses l
      LEFT JOIN issuing_agencies ia ON ia.id = l.issuing_agency_id
      WHERE l.customer_id = ${customerId}::uuid
      ORDER BY
        CASE l.status
          WHEN 'EXPIRED'   THEN 1
          WHEN 'ATTENTION' THEN 2
          WHEN 'REGULAR'   THEN 3
          ELSE 4
        END ASC,
        l.expiration_date ASC
    `;
  }
}

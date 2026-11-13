import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { Alert, AlertStatus, ListAlertsQuery } from '../domain/alert.entity';
import { AlertsRepository } from '../domain/alerts.repository';

const relations = {
  customer: { select: { id: true, name: true } },
  license: { select: { id: true, type: true, processNumber: true } },
  licenseCondition: { select: { id: true, name: true } },
} satisfies Prisma.AlertInclude;

type AlertRow = Prisma.AlertGetPayload<{ include: typeof relations }>;

@Injectable()
export class PrismaAlertRepository implements AlertsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private visibleTo(ownerUserId: string): Prisma.AlertWhereInput {
    return {
      customer: { ownerUserId, isDeleted: false },
      license: { customer: { ownerUserId, isDeleted: false } },
      dueDate: { not: null },
      OR: [
        { type: 'LICENSE_EXPIRATION', licenseConditionId: null },
        {
          type: 'CONDITION_DUE',
          licenseCondition: {
            license: { customer: { ownerUserId, isDeleted: false } },
          },
        },
      ],
    };
  }

  async list(ownerUserId: string, query: ListAlertsQuery) {
    const where: Prisma.AlertWhereInput = {
      ...this.visibleTo(ownerUserId),
      status: { in: query.status },
    };
    const [rows, total] = await this.prisma.$transaction(
      [
        this.prisma.alert.findMany({
          where,
          include: relations,
          // PostgreSQL enum order is LOW, MEDIUM, HIGH.
          orderBy: [{ severity: 'desc' }, { dueDate: 'asc' }, { id: 'asc' }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
        this.prisma.alert.count({ where }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    return {
      items: rows.map((row) => this.toDomain(row)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  countUnread(ownerUserId: string) {
    return this.prisma.alert.count({
      where: { ...this.visibleTo(ownerUserId), status: 'OPEN' },
    });
  }

  async updateStatus(
    ownerUserId: string,
    id: string,
    status: Exclude<AlertStatus, 'OPEN'>,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const result = await transaction.alert.updateMany({
        where: { ...this.visibleTo(ownerUserId), id },
        data: { status },
      });
      if (!result.count) return null;
      const row = await transaction.alert.findFirst({
        where: { ...this.visibleTo(ownerUserId), id },
        include: relations,
      });
      return row ? this.toDomain(row) : null;
    });
  }

  private toDomain(row: AlertRow): Alert {
    if (!row.license || !row.dueDate || row.type === 'NEW_LEGISLATION') {
      throw new Error('Unsupported alert record');
    }
    return {
      id: row.id,
      type: row.type,
      severity: row.severity,
      status: row.status,
      dueDate: row.dueDate,
      createdAt: row.createdAt,
      customer: row.customer,
      license: row.license,
      condition: row.licenseCondition,
    };
  }
}

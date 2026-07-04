import { Injectable } from '@nestjs/common';
import { CustomerHistory, Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

type Db = Pick<PrismaService, 'customerHistory'>;

@Injectable()
export class CustomerHistoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  append(
    data: { customerId: string; changedByUserId: string; changes: Prisma.InputJsonValue },
    db: Db = this.prisma,
  ): Promise<CustomerHistory> {
    return db.customerHistory.create({ data });
  }

  findByCustomerId(customerId: string): Promise<CustomerHistory[]> {
    return this.prisma.customerHistory.findMany({ where: { customerId }, orderBy: { changedAt: 'asc' } });
  }

  // Re-parents every history row of a discarded Customer onto the merge survivor
  // (research.md #6) — "historial combinado" means the survivor's timeline includes
  // the discarded Customer's edits, not a copy under a separate id.
  reparent(fromCustomerId: string, toCustomerId: string, db: Db = this.prisma): Promise<Prisma.BatchPayload> {
    return db.customerHistory.updateMany({ where: { customerId: fromCustomerId }, data: { customerId: toCustomerId } });
  }
}

import { Injectable } from '@nestjs/common';
import { ContactHistory, Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class ContactHistoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  append(data: { contactId: string; changedByUserId: string; changes: Prisma.InputJsonValue }): Promise<ContactHistory> {
    return this.prisma.contactHistory.create({ data });
  }

  findByContactId(contactId: string): Promise<ContactHistory[]> {
    return this.prisma.contactHistory.findMany({ where: { contactId }, orderBy: { changedAt: 'asc' } });
  }

  // Re-parents every history row of a discarded Contact onto the merge survivor
  // (research.md #6), same pattern as CustomerHistoryRepository.reparent.
  reparent(fromContactId: string, toContactId: string): Promise<Prisma.BatchPayload> {
    return this.prisma.contactHistory.updateMany({ where: { contactId: fromContactId }, data: { contactId: toContactId } });
  }
}

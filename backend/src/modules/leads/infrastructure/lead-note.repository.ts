import { Injectable } from '@nestjs/common';
import { LeadNote } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

// Append-only (research.md #6) — no update/delete of an individual note.
@Injectable()
export class LeadNoteRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: { leadId: string; authorUserId: string; note: string }): Promise<LeadNote> {
    return this.prisma.leadNote.create({ data });
  }

  findByLeadId(leadId: string): Promise<LeadNote[]> {
    return this.prisma.leadNote.findMany({ where: { leadId }, orderBy: { createdAt: 'asc' } });
  }
}

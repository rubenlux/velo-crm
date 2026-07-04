import { Injectable } from '@nestjs/common';
import { LeadNote } from '@prisma/client';
import { LeadRepository } from '../infrastructure/lead.repository';
import { LeadNoteRepository } from '../infrastructure/lead-note.repository';
import { LeadNotFoundError } from '../domain/errors';

@Injectable()
export class ListLeadNotesUseCase {
  constructor(
    private readonly leads: LeadRepository,
    private readonly notes: LeadNoteRepository,
  ) {}

  async execute(organizationId: string, leadId: string): Promise<LeadNote[]> {
    const lead = await this.leads.findById(organizationId, leadId);
    if (!lead) {
      throw new LeadNotFoundError();
    }
    return this.notes.findByLeadId(leadId);
  }
}

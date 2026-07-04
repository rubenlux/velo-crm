import { Injectable } from '@nestjs/common';
import { LeadNote } from '@prisma/client';
import { LeadRepository } from '../infrastructure/lead.repository';
import { LeadNoteRepository } from '../infrastructure/lead-note.repository';
import { LeadNotFoundError } from '../domain/errors';

export interface AddLeadNoteInput {
  organizationId: string;
  actorUserId: string;
  leadId: string;
  note: string;
}

@Injectable()
export class AddLeadNoteUseCase {
  constructor(
    private readonly leads: LeadRepository,
    private readonly notes: LeadNoteRepository,
  ) {}

  async execute(input: AddLeadNoteInput): Promise<LeadNote> {
    const lead = await this.leads.findById(input.organizationId, input.leadId);
    if (!lead) {
      throw new LeadNotFoundError();
    }
    return this.notes.create({ leadId: input.leadId, authorUserId: input.actorUserId, note: input.note });
  }
}

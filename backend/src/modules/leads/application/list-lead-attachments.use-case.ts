import { Injectable } from '@nestjs/common';
import { LeadAttachment } from '@prisma/client';
import { LeadRepository } from '../infrastructure/lead.repository';
import { LeadAttachmentRepository } from '../infrastructure/lead-attachment.repository';
import { LeadNotFoundError } from '../domain/errors';

@Injectable()
export class ListLeadAttachmentsUseCase {
  constructor(
    private readonly leads: LeadRepository,
    private readonly attachments: LeadAttachmentRepository,
  ) {}

  async execute(organizationId: string, leadId: string): Promise<LeadAttachment[]> {
    const lead = await this.leads.findById(organizationId, leadId);
    if (!lead) {
      throw new LeadNotFoundError();
    }
    return this.attachments.findByLeadId(leadId);
  }
}

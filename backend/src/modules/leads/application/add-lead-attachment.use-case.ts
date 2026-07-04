import { Injectable } from '@nestjs/common';
import { LeadAttachment } from '@prisma/client';
import { LeadRepository } from '../infrastructure/lead.repository';
import { LeadAttachmentRepository } from '../infrastructure/lead-attachment.repository';
import { LeadNotFoundError } from '../domain/errors';

export interface AddLeadAttachmentInput {
  organizationId: string;
  actorUserId: string;
  leadId: string;
  fileName: string;
  fileUrl: string;
}

@Injectable()
export class AddLeadAttachmentUseCase {
  constructor(
    private readonly leads: LeadRepository,
    private readonly attachments: LeadAttachmentRepository,
  ) {}

  async execute(input: AddLeadAttachmentInput): Promise<LeadAttachment> {
    const lead = await this.leads.findById(input.organizationId, input.leadId);
    if (!lead) {
      throw new LeadNotFoundError();
    }
    return this.attachments.create({
      leadId: input.leadId,
      fileName: input.fileName,
      fileUrl: input.fileUrl,
      uploadedByUserId: input.actorUserId,
    });
  }
}

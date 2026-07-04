import { Injectable } from '@nestjs/common';
import { Lead } from '@prisma/client';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { LeadRepository } from '../infrastructure/lead.repository';
import { LeadNotFoundError } from '../domain/errors';

export interface LoseLeadInput {
  organizationId: string;
  actorUserId: string;
  leadId: string;
}

// FR-013, research.md #12: saves the pre-loss status so reactivation can restore it
// exactly, rather than a fixed arbitrary destination.
@Injectable()
export class LoseLeadUseCase {
  constructor(
    private readonly leads: LeadRepository,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: LoseLeadInput): Promise<Lead> {
    const lead = await this.leads.findById(input.organizationId, input.leadId);
    if (!lead) {
      throw new LeadNotFoundError();
    }

    const updated = await this.leads.update(input.organizationId, input.leadId, {
      status: 'Perdido',
      statusBeforeLost: lead.status,
    });

    await this.auditLog.publish({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'LeadLost',
      metadata: { leadId: input.leadId, previousStatus: lead.status, newStatus: 'Perdido' },
    });

    return updated;
  }
}

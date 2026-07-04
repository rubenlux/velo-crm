import { Injectable } from '@nestjs/common';
import { Lead } from '@prisma/client';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { LeadRepository } from '../infrastructure/lead.repository';
import { LeadNotFoundError, LeadNotLostError } from '../domain/errors';

export interface ReactivateLeadInput {
  organizationId: string;
  actorUserId: string;
  leadId: string;
}

@Injectable()
export class ReactivateLeadUseCase {
  constructor(
    private readonly leads: LeadRepository,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: ReactivateLeadInput): Promise<Lead> {
    const lead = await this.leads.findById(input.organizationId, input.leadId);
    if (!lead) {
      throw new LeadNotFoundError();
    }
    if (lead.status !== 'Perdido') {
      throw new LeadNotLostError();
    }

    const restoredStatus = lead.statusBeforeLost ?? 'Nuevo';
    const updated = await this.leads.update(input.organizationId, input.leadId, {
      status: restoredStatus,
      statusBeforeLost: null,
    });

    await this.auditLog.publish({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'LeadReactivated',
      metadata: { leadId: input.leadId, previousStatus: 'Perdido', newStatus: restoredStatus },
    });

    return updated;
  }
}

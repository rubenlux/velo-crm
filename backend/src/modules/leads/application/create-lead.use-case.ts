import { Injectable } from '@nestjs/common';
import { Lead, LeadSource, Prisma } from '@prisma/client';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { LeadRepository } from '../infrastructure/lead.repository';

export interface CreateLeadInput {
  organizationId: string;
  actorUserId: string;
  name: string;
  company?: string;
  jobTitle?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  country?: string;
  state?: string;
  city?: string;
  address?: string;
  source?: LeadSource;
  campaign?: string;
  interest?: string;
  ownerUserId?: string;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high';
  customFields?: Record<string, unknown>;
}

@Injectable()
export class CreateLeadUseCase {
  constructor(
    private readonly leads: LeadRepository,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: CreateLeadInput): Promise<Lead> {
    const lead = await this.leads.create({
      organizationId: input.organizationId,
      name: input.name,
      company: input.company,
      jobTitle: input.jobTitle,
      email: input.email,
      phone: input.phone,
      whatsapp: input.whatsapp,
      country: input.country,
      state: input.state,
      city: input.city,
      address: input.address,
      source: input.source,
      campaign: input.campaign,
      interest: input.interest,
      ownerUserId: input.ownerUserId,
      tags: input.tags ?? [],
      priority: input.priority,
      customFields: (input.customFields ?? {}) as Prisma.InputJsonValue,
    });

    await this.auditLog.publish({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'LeadCreated',
      metadata: { leadId: lead.id },
    });

    return lead;
  }
}

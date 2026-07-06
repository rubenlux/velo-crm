import { Injectable } from '@nestjs/common';
import { CustomerPriority } from '@prisma/client';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { CustomerRepository } from '../../customers/infrastructure/customer.repository';
import { ContactRepository } from '../../contacts/infrastructure/contact.repository';
import { LeadRepository } from '../../leads/infrastructure/lead.repository';
import { OpportunityRepository } from '../../opportunities/infrastructure/opportunity.repository';
import { ActivityTypeRepository } from '../infrastructure/activity-type.repository';
import { ActivityRepository, ActivityWithType } from '../infrastructure/activity.repository';
import {
  ActivityNoRelationError,
  ActivityRelatedEntitiesMismatchError,
  ActivityRelatedEntityNotFoundError,
  ActivityTypeNotFoundError,
} from '../domain/errors';

export interface CreateActivityInput {
  organizationId: string;
  actorUserId: string;
  customerId?: string;
  contactId?: string;
  leadId?: string;
  opportunityId?: string;
  activityTypeId: string;
  title: string;
  description?: string;
  scheduledAt: string;
  durationMinutes?: number;
  priority?: CustomerPriority;
  ownerUserId?: string;
  participantUserIds?: string[];
  tags?: string[];
}

@Injectable()
export class CreateActivityUseCase {
  constructor(
    private readonly customers: CustomerRepository,
    private readonly contacts: ContactRepository,
    private readonly leads: LeadRepository,
    private readonly opportunities: OpportunityRepository,
    private readonly activityTypes: ActivityTypeRepository,
    private readonly activities: ActivityRepository,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: CreateActivityInput): Promise<ActivityWithType> {
    if (!input.customerId && !input.contactId && !input.leadId && !input.opportunityId) {
      throw new ActivityNoRelationError();
    }

    const activityType = await this.activityTypes.findById(input.organizationId, input.activityTypeId);
    if (!activityType) {
      throw new ActivityTypeNotFoundError();
    }

    // Resuelve el Customer implícito de cada entidad relacionada provista y exige
    // que todas coincidan (RN-004/FR-002a, research.md #2 de spec 012). Un Lead sin
    // convertir no aporta ningún Customer implícito, así que no genera conflicto.
    const impliedCustomerIds = new Set<string>();

    if (input.customerId) {
      const customer = await this.customers.findById(input.organizationId, input.customerId);
      if (!customer) throw new ActivityRelatedEntityNotFoundError();
      impliedCustomerIds.add(customer.id);
    }
    if (input.contactId) {
      const contact = await this.contacts.findById(input.organizationId, input.contactId);
      if (!contact) throw new ActivityRelatedEntityNotFoundError();
      impliedCustomerIds.add(contact.customerId);
    }
    if (input.leadId) {
      const lead = await this.leads.findById(input.organizationId, input.leadId);
      if (!lead) throw new ActivityRelatedEntityNotFoundError();
      if (lead.convertedCustomerId) impliedCustomerIds.add(lead.convertedCustomerId);
    }
    if (input.opportunityId) {
      const opportunity = await this.opportunities.findById(input.organizationId, input.opportunityId);
      if (!opportunity) throw new ActivityRelatedEntityNotFoundError();
      impliedCustomerIds.add(opportunity.customerId);
    }

    if (impliedCustomerIds.size > 1) {
      throw new ActivityRelatedEntitiesMismatchError();
    }

    const activity = await this.activities.create({
      organizationId: input.organizationId,
      customerId: input.customerId,
      contactId: input.contactId,
      leadId: input.leadId,
      opportunityId: input.opportunityId,
      activityTypeId: input.activityTypeId,
      title: input.title,
      description: input.description,
      scheduledAt: new Date(input.scheduledAt),
      durationMinutes: input.durationMinutes,
      priority: input.priority,
      authorUserId: input.actorUserId,
      ownerUserId: input.ownerUserId,
      participantUserIds: input.participantUserIds ?? [],
      tags: input.tags ?? [],
    });

    await this.auditLog.publish({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'ActivityCreated',
      metadata: { activityId: activity.id },
    });

    return activity;
  }
}

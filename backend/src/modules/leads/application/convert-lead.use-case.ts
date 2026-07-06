import { Injectable } from '@nestjs/common';
import { Contact, Customer, Lead, LeadStatus } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { CustomerRepository } from '../../customers/infrastructure/customer.repository';
import { ContactRepository } from '../../contacts/infrastructure/contact.repository';
import { PipelineRepository } from '../../opportunities/infrastructure/pipeline.repository';
import { PipelineStageRepository } from '../../opportunities/infrastructure/pipeline-stage.repository';
import { OpportunityRepository, OpportunityWithStage } from '../../opportunities/infrastructure/opportunity.repository';
import { LeadRepository } from '../infrastructure/lead.repository';
import {
  LeadAlreadyConvertedError,
  LeadConversionLinkNotFoundError,
  LeadDuplicateWarning,
  LeadNotConvertibleError,
  LeadNotFoundError,
} from '../domain/errors';

// Prospecto calificado (FR-010) is read as "in an active working state" — see
// research.md #11 — not strictly LeadStatus.Calificado.
const CONVERTIBLE_STATUSES: LeadStatus[] = ['Nuevo', 'Contactado', 'Calificado', 'EnNegociacion'];

export interface ConvertLeadInput {
  organizationId: string;
  actorUserId: string;
  leadId: string;
  linkToExistingCustomerId?: string;
  linkToExistingContactId?: string;
  forceCreateNew?: boolean;
}

export interface ConvertLeadResult {
  lead: Lead;
  customer: Customer;
  contact: Contact;
  opportunity: OpportunityWithStage;
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim();
  const spaceIndex = trimmed.indexOf(' ');
  if (spaceIndex === -1) {
    return { firstName: trimmed, lastName: '' };
  }
  return { firstName: trimmed.slice(0, spaceIndex), lastName: trimmed.slice(spaceIndex + 1) };
}

@Injectable()
export class ConvertLeadUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leads: LeadRepository,
    private readonly customers: CustomerRepository,
    private readonly contacts: ContactRepository,
    private readonly pipelines: PipelineRepository,
    private readonly pipelineStages: PipelineStageRepository,
    private readonly opportunities: OpportunityRepository,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: ConvertLeadInput): Promise<ConvertLeadResult> {
    const lead = await this.leads.findById(input.organizationId, input.leadId);
    if (!lead) {
      throw new LeadNotFoundError();
    }
    if (lead.status === 'Convertido') {
      throw new LeadAlreadyConvertedError();
    }
    if (!CONVERTIBLE_STATUSES.includes(lead.status)) {
      throw new LeadNotConvertibleError();
    }

    if (!input.linkToExistingCustomerId && !input.linkToExistingContactId && !input.forceCreateNew) {
      const [dupCustomer, dupContact] = await Promise.all([
        this.customers.findByEmailOrPhone(input.organizationId, lead.email, lead.phone),
        this.contacts.findByEmailOrPhone(input.organizationId, lead.email, lead.phone),
      ]);
      if (dupCustomer || dupContact) {
        throw new LeadDuplicateWarning(dupCustomer?.id, dupContact?.id);
      }
    }

    // Resolve and validate link targets scoped to this Organization *before* the
    // transaction — an unscoped lookup here would let a caller in one Organization
    // link a Lead's conversion to a Customer/Contact belonging to a different one.
    let linkedCustomer: Customer | null = null;
    if (input.linkToExistingCustomerId) {
      linkedCustomer = await this.customers.findById(input.organizationId, input.linkToExistingCustomerId);
      if (!linkedCustomer) {
        throw new LeadConversionLinkNotFoundError();
      }
    }
    let linkedContact: Contact | null = null;
    if (input.linkToExistingContactId) {
      linkedContact = await this.contacts.findById(input.organizationId, input.linkToExistingContactId);
      if (!linkedContact) {
        throw new LeadConversionLinkNotFoundError();
      }
    }

    // Pipeline por defecto perezoso (spec 011 research.md #3) — fuera de la
    // transacción de abajo, es su propia operación idempotente (índice único
    // parcial + catch, ver PipelineRepository.findOrCreateDefault).
    const pipeline = await this.pipelines.findOrCreateDefault(input.organizationId);
    const stages = await this.pipelineStages.findByPipelineId(pipeline.id);
    const firstStage = stages[0];

    return this.prisma.$transaction(async (tx) => {
      const convertedCount = await this.leads.transitionIfStatusIn(
        input.organizationId,
        input.leadId,
        CONVERTIBLE_STATUSES,
        { status: 'Convertido' },
        tx,
      );
      if (convertedCount === 0) {
        // Another request won the race between our pre-check above and this write.
        throw new LeadAlreadyConvertedError();
      }

      let customer: Customer;
      if (linkedCustomer) {
        customer = linkedCustomer;
      } else {
        customer = await this.customers.create(
          {
            organizationId: input.organizationId,
            name: lead.company || lead.name,
            email: lead.email,
            phone: lead.phone,
            website: undefined,
            country: lead.country,
            state: lead.state,
            city: lead.city,
            address: lead.address,
            ownerUserId: lead.ownerUserId,
            source: 'Lead',
            tags: lead.tags,
          },
          tx,
        );
        await this.auditLog.publish(
          { organizationId: input.organizationId, actorUserId: input.actorUserId, action: 'CustomerCreated', metadata: { customerId: customer.id } },
          tx,
        );
      }

      let contact: Contact;
      if (linkedContact) {
        contact = linkedContact;
      } else {
        const { firstName, lastName } = splitName(lead.name);
        contact = await this.contacts.create(
          {
            organizationId: input.organizationId,
            customerId: customer.id,
            firstName,
            lastName,
            jobTitle: lead.jobTitle,
            company: customer.name,
            primaryEmail: lead.email,
            primaryPhone: lead.phone,
            whatsapp: lead.whatsapp,
            country: lead.country,
            state: lead.state,
            city: lead.city,
            address: lead.address,
            ownerUserId: lead.ownerUserId,
            tags: lead.tags,
            isPrimary: true,
          },
          tx,
        );
        await this.auditLog.publish(
          { organizationId: input.organizationId, actorUserId: input.actorUserId, action: 'ContactCreated', metadata: { contactId: contact.id, customerId: customer.id } },
          tx,
        );
      }

      const opportunity = await this.opportunities.create(
        {
          organizationId: input.organizationId,
          customerId: customer.id,
          contactId: contact.id,
          leadId: lead.id,
          name: lead.company ? `${lead.name} (${lead.company})` : lead.name,
          ownerUserId: lead.ownerUserId,
          pipelineId: pipeline.id,
          stageId: firstStage.id,
          state: 'Abierta',
          source: 'Lead',
        },
        tx,
      );

      const updatedLead = await this.leads.update(
        input.organizationId,
        input.leadId,
        {
          convertedCustomerId: customer.id,
          convertedContactId: contact.id,
          convertedOpportunityId: opportunity.id,
          convertedAt: new Date(),
        },
        tx,
      );

      await this.auditLog.publish(
        {
          organizationId: input.organizationId,
          actorUserId: input.actorUserId,
          action: 'LeadConverted',
          metadata: { leadId: lead.id, customerId: customer.id, contactId: contact.id, opportunityId: opportunity.id },
        },
        tx,
      );

      return { lead: updatedLead, customer, contact, opportunity };
    });
  }
}

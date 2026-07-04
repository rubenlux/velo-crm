import { Injectable } from '@nestjs/common';
import { Contact, Prisma } from '@prisma/client';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { CustomerRepository } from '../../customers/infrastructure/customer.repository';
import { ContactRepository } from '../infrastructure/contact.repository';
import { CustomerNotFoundForContactError } from '../domain/errors';

export interface CreateContactInput {
  organizationId: string;
  actorUserId: string;
  customerId: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
  birthDate?: string;
  gender?: string;
  jobTitle?: string;
  department?: string;
  area?: string;
  decisionLevel?: string;
  primaryEmail?: string;
  secondaryEmails?: string[];
  primaryPhone?: string;
  secondaryPhones?: string[];
  whatsapp?: string;
  linkedin?: string;
  website?: string;
  country?: string;
  state?: string;
  city?: string;
  address?: string;
  ownerUserId?: string;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high';
  customFields?: Record<string, unknown>;
}

@Injectable()
export class CreateContactUseCase {
  constructor(
    private readonly contacts: ContactRepository,
    private readonly customers: CustomerRepository,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: CreateContactInput): Promise<Contact> {
    const customer = await this.customers.findById(input.organizationId, input.customerId);
    if (!customer) {
      throw new CustomerNotFoundForContactError();
    }

    const contact = await this.contacts.create({
      organizationId: input.organizationId,
      customerId: input.customerId,
      firstName: input.firstName,
      lastName: input.lastName,
      photoUrl: input.photoUrl,
      birthDate: input.birthDate ? new Date(input.birthDate) : undefined,
      gender: input.gender,
      jobTitle: input.jobTitle,
      department: input.department,
      area: input.area,
      decisionLevel: input.decisionLevel,
      company: customer.name,
      primaryEmail: input.primaryEmail,
      secondaryEmails: input.secondaryEmails ?? [],
      primaryPhone: input.primaryPhone,
      secondaryPhones: input.secondaryPhones ?? [],
      whatsapp: input.whatsapp,
      linkedin: input.linkedin,
      website: input.website,
      country: input.country,
      state: input.state,
      city: input.city,
      address: input.address,
      ownerUserId: input.ownerUserId,
      tags: input.tags ?? [],
      priority: input.priority,
      customFields: (input.customFields ?? {}) as Prisma.InputJsonValue,
    });

    await this.auditLog.publish({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'ContactCreated',
      metadata: { contactId: contact.id, customerId: input.customerId },
    });

    return contact;
  }
}

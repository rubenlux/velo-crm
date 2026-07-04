import { Injectable } from '@nestjs/common';
import { Customer, CustomerType, Prisma } from '@prisma/client';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { CustomerRepository } from '../infrastructure/customer.repository';
import { CustomerDuplicateTaxIdError } from '../domain/errors';

export interface CreateCustomerInput {
  organizationId: string;
  actorUserId: string;
  name: string;
  legalName?: string;
  tradeName?: string;
  type?: CustomerType;
  taxId?: string;
  taxCondition?: string;
  email?: string;
  phone?: string;
  website?: string;
  country?: string;
  state?: string;
  city?: string;
  address?: string;
  ownerUserId?: string;
  source?: string;
  category?: string;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high';
  customFields?: Record<string, unknown>;
}

@Injectable()
export class CreateCustomerUseCase {
  constructor(
    private readonly customers: CustomerRepository,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: CreateCustomerInput): Promise<Customer> {
    if (input.taxId) {
      const existing = await this.customers.findByTaxId(input.organizationId, input.taxId);
      if (existing) {
        throw new CustomerDuplicateTaxIdError();
      }
    }

    const customer = await this.customers.create({
      organizationId: input.organizationId,
      name: input.name,
      legalName: input.legalName,
      tradeName: input.tradeName,
      type: input.type,
      taxId: input.taxId,
      taxCondition: input.taxCondition,
      email: input.email,
      phone: input.phone,
      website: input.website,
      country: input.country,
      state: input.state,
      city: input.city,
      address: input.address,
      ownerUserId: input.ownerUserId,
      source: input.source,
      category: input.category,
      tags: input.tags ?? [],
      priority: input.priority,
      customFields: (input.customFields ?? {}) as Prisma.InputJsonValue,
    });

    await this.auditLog.publish({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: 'CustomerCreated',
      metadata: { customerId: customer.id },
    });

    return customer;
  }
}

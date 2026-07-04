import { Injectable } from '@nestjs/common';
import { Customer, CustomerType, Prisma } from '@prisma/client';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { CustomerRepository } from '../infrastructure/customer.repository';
import { CustomerHistoryRepository } from '../infrastructure/customer-history.repository';
import { CustomerDuplicateTaxIdError, CustomerMergedError, CustomerNotFoundError, CustomerStaleUpdateError } from '../domain/errors';

export interface UpdateCustomerInput {
  organizationId: string;
  actorUserId: string;
  customerId: string;
  version: number;
  name?: string;
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

// Fields the DTO may carry that aren't columns diffed against the current row.
const NON_FIELD_KEYS = new Set(['organizationId', 'actorUserId', 'customerId', 'version']);

@Injectable()
export class UpdateCustomerUseCase {
  constructor(
    private readonly customers: CustomerRepository,
    private readonly history: CustomerHistoryRepository,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: UpdateCustomerInput): Promise<Customer> {
    const current = await this.customers.findById(input.organizationId, input.customerId);
    if (!current) {
      throw new CustomerNotFoundError();
    }
    if (current.mergedIntoCustomerId) {
      throw new CustomerMergedError(current.mergedIntoCustomerId);
    }

    if (input.taxId !== undefined && input.taxId !== null && input.taxId !== current.taxId) {
      const existing = await this.customers.findByTaxId(input.organizationId, input.taxId);
      if (existing && existing.id !== current.id) {
        throw new CustomerDuplicateTaxIdError();
      }
    }

    const changes: Record<string, { before: unknown; after: unknown }> = {};
    for (const [key, after] of Object.entries(input)) {
      if (NON_FIELD_KEYS.has(key) || after === undefined) {
        continue;
      }
      const before = (current as unknown as Record<string, unknown>)[key];
      const beforeComparable = Array.isArray(before) ? JSON.stringify(before) : before;
      const afterComparable = Array.isArray(after) ? JSON.stringify(after) : after;
      if (beforeComparable !== afterComparable) {
        changes[key] = { before: before ?? null, after };
      }
    }

    const { organizationId, actorUserId, customerId, version, ...fields } = input;
    const updated = await this.customers.updateWithVersionCheck(organizationId, customerId, version, {
      ...fields,
      customFields: fields.customFields ? (fields.customFields as Prisma.InputJsonValue) : undefined,
    });
    if (!updated) {
      throw new CustomerStaleUpdateError();
    }

    if (Object.keys(changes).length > 0) {
      await this.history.append({
        customerId,
        changedByUserId: actorUserId,
        changes: changes as Prisma.InputJsonValue,
      });
      await this.auditLog.publish({
        organizationId,
        actorUserId,
        action: 'CustomerUpdated',
        metadata: { customerId, fields: Object.keys(changes) },
      });
    }

    return updated;
  }
}

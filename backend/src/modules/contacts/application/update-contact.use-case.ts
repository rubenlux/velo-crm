import { Injectable } from '@nestjs/common';
import { Contact, Prisma } from '@prisma/client';
import { AuditLogPublisher } from '../../../shared/audit/audit-log.publisher';
import { ContactRepository } from '../infrastructure/contact.repository';
import { ContactHistoryRepository } from '../infrastructure/contact-history.repository';
import { ContactMergedError, ContactNotFoundError, ContactStaleUpdateError } from '../domain/errors';

export interface UpdateContactInput {
  organizationId: string;
  actorUserId: string;
  contactId: string;
  version: number;
  firstName?: string;
  lastName?: string;
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

const NON_FIELD_KEYS = new Set(['organizationId', 'actorUserId', 'contactId', 'version']);

function comparable(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return JSON.stringify(value);
  return value;
}

@Injectable()
export class UpdateContactUseCase {
  constructor(
    private readonly contacts: ContactRepository,
    private readonly history: ContactHistoryRepository,
    private readonly auditLog: AuditLogPublisher,
  ) {}

  async execute(input: UpdateContactInput): Promise<Contact> {
    const current = await this.contacts.findById(input.organizationId, input.contactId);
    if (!current) {
      throw new ContactNotFoundError();
    }
    if (current.mergedIntoContactId) {
      throw new ContactMergedError(current.mergedIntoContactId);
    }

    const changes: Record<string, { before: unknown; after: unknown }> = {};
    for (const [key, rawAfter] of Object.entries(input)) {
      if (NON_FIELD_KEYS.has(key) || rawAfter === undefined) {
        continue;
      }
      const before = (current as unknown as Record<string, unknown>)[key];
      const after = key === 'birthDate' ? new Date(rawAfter as string) : rawAfter;
      if (comparable(before) !== comparable(after)) {
        changes[key] = { before: before ?? null, after: rawAfter };
      }
    }

    const { organizationId, actorUserId, contactId, version, birthDate, ...rest } = input;
    const updated = await this.contacts.updateWithVersionCheck(organizationId, contactId, version, {
      ...rest,
      birthDate: birthDate !== undefined ? new Date(birthDate) : undefined,
      customFields: rest.customFields ? (rest.customFields as Prisma.InputJsonValue) : undefined,
    });
    if (!updated) {
      throw new ContactStaleUpdateError();
    }

    if (Object.keys(changes).length > 0) {
      await this.history.append({ contactId, changedByUserId: actorUserId, changes: changes as Prisma.InputJsonValue });
      await this.auditLog.publish({
        organizationId,
        actorUserId,
        action: 'ContactUpdated',
        metadata: { contactId, fields: Object.keys(changes) },
      });
    }

    return updated;
  }
}

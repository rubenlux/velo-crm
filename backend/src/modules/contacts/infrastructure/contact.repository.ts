import { Injectable } from '@nestjs/common';
import { Contact, Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

type Db = Pick<PrismaService, 'contact'>;

export interface ContactSearchFilters {
  q?: string;
  customerId?: string;
  status?: string;
  ownerUserId?: string;
  tag?: string;
  skip?: number;
  take?: number;
}

@Injectable()
export class ContactRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.ContactUncheckedCreateInput, db: Db = this.prisma): Promise<Contact> {
    return db.contact.create({ data });
  }

  // Scoped by organizationId in the query itself — same defense-in-depth pattern as
  // CustomerRepository/OrganizationInvitationRepository.
  findById(organizationId: string, contactId: string): Promise<Contact | null> {
    return this.prisma.contact.findFirst({ where: { id: contactId, organizationId } });
  }

  // Duplicate detection for Lead conversion (spec 010, research.md #11) — exact match
  // only, not the fuzzy `search()` OR-across-fields query.
  findByEmailOrPhone(organizationId: string, email?: string | null, phone?: string | null): Promise<Contact | null> {
    if (!email && !phone) {
      return Promise.resolve(null);
    }
    return this.prisma.contact.findFirst({
      where: {
        organizationId,
        mergedIntoContactId: null,
        OR: [...(email ? [{ primaryEmail: email }] : []), ...(phone ? [{ primaryPhone: phone }] : [])],
      },
    });
  }

  findPrimaryForCustomer(organizationId: string, customerId: string): Promise<Contact | null> {
    return this.prisma.contact.findFirst({ where: { organizationId, customerId, isPrimary: true } });
  }

  async updateWithVersionCheck(
    organizationId: string,
    contactId: string,
    expectedVersion: number,
    data: Prisma.ContactUncheckedUpdateInput,
  ): Promise<Contact | null> {
    const { count } = await this.prisma.contact.updateMany({
      where: { id: contactId, organizationId, version: expectedVersion },
      data: { ...data, version: { increment: 1 } },
    });
    if (count === 0) {
      return null;
    }
    return this.prisma.contact.findUniqueOrThrow({ where: { id: contactId } });
  }

  async update(organizationId: string, contactId: string, data: Prisma.ContactUncheckedUpdateInput): Promise<Contact> {
    await this.prisma.contact.updateMany({ where: { id: contactId, organizationId }, data });
    return this.prisma.contact.findUniqueOrThrow({ where: { id: contactId } });
  }

  // Atomically unsets any previous primary Contact of this Customer and marks the
  // target one as primary (research.md #4) — backed by a partial unique index in the
  // database as defense-in-depth against a race between two concurrent calls.
  async setPrimary(organizationId: string, customerId: string, contactId: string): Promise<Contact> {
    const [, contact] = await this.prisma.$transaction([
      this.prisma.contact.updateMany({ where: { organizationId, customerId, isPrimary: true }, data: { isPrimary: false } }),
      this.prisma.contact.update({ where: { id: contactId }, data: { isPrimary: true } }),
    ]);
    return contact;
  }

  async search(organizationId: string, filters: ContactSearchFilters): Promise<{ items: Contact[]; total: number }> {
    const where: Prisma.ContactWhereInput = { organizationId, mergedIntoContactId: null };
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.status) where.status = filters.status as Contact['status'];
    if (filters.ownerUserId) where.ownerUserId = filters.ownerUserId;
    if (filters.tag) where.tags = { has: filters.tag };
    if (filters.q) {
      where.OR = [
        { firstName: { contains: filters.q, mode: 'insensitive' } },
        { lastName: { contains: filters.q, mode: 'insensitive' } },
        { primaryEmail: { contains: filters.q, mode: 'insensitive' } },
        { primaryPhone: { contains: filters.q, mode: 'insensitive' } },
        { whatsapp: { contains: filters.q, mode: 'insensitive' } },
        { jobTitle: { contains: filters.q, mode: 'insensitive' } },
        { company: { contains: filters.q, mode: 'insensitive' } },
        { city: { contains: filters.q, mode: 'insensitive' } },
        { tags: { has: filters.q } },
        { secondaryEmails: { has: filters.q } },
        { secondaryPhones: { has: filters.q } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: filters.skip ?? 0,
        take: filters.take ?? 50,
      }),
      this.prisma.contact.count({ where }),
    ]);
    return { items, total };
  }
}

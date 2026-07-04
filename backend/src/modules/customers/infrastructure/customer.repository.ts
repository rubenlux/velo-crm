import { Injectable } from '@nestjs/common';
import { Customer, Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

type Db = Pick<PrismaService, 'customer'>;

export interface CustomerSearchFilters {
  q?: string;
  status?: string;
  ownerUserId?: string;
  city?: string;
  state?: string;
  country?: string;
  category?: string;
  tag?: string;
  createdFrom?: Date;
  createdTo?: Date;
  skip?: number;
  take?: number;
}

@Injectable()
export class CustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.CustomerUncheckedCreateInput, db: Db = this.prisma): Promise<Customer> {
    return db.customer.create({ data });
  }

  // Scoped by organizationId at the query level (not just checked by the caller
  // afterwards) — same defense-in-depth pattern as OrganizationInvitationRepository.
  findById(organizationId: string, customerId: string): Promise<Customer | null> {
    return this.prisma.customer.findFirst({ where: { id: customerId, organizationId } });
  }

  findByTaxId(organizationId: string, taxId: string): Promise<Customer | null> {
    return this.prisma.customer.findFirst({ where: { organizationId, taxId } });
  }

  async updateWithVersionCheck(
    organizationId: string,
    customerId: string,
    expectedVersion: number,
    data: Prisma.CustomerUncheckedUpdateInput,
  ): Promise<Customer | null> {
    const { count } = await this.prisma.customer.updateMany({
      where: { id: customerId, organizationId, version: expectedVersion },
      data: { ...data, version: { increment: 1 } },
    });
    if (count === 0) {
      return null;
    }
    return this.prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
  }

  async update(organizationId: string, customerId: string, data: Prisma.CustomerUncheckedUpdateInput): Promise<Customer> {
    await this.prisma.customer.updateMany({ where: { id: customerId, organizationId }, data });
    return this.prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
  }

  async search(organizationId: string, filters: CustomerSearchFilters): Promise<{ items: Customer[]; total: number }> {
    const where: Prisma.CustomerWhereInput = {
      organizationId,
      mergedIntoCustomerId: null,
    };
    if (filters.status) where.status = filters.status as Customer['status'];
    if (filters.ownerUserId) where.ownerUserId = filters.ownerUserId;
    if (filters.city) where.city = filters.city;
    if (filters.state) where.state = filters.state;
    if (filters.country) where.country = filters.country;
    if (filters.category) where.category = filters.category;
    if (filters.tag) where.tags = { has: filters.tag };
    if (filters.createdFrom || filters.createdTo) {
      where.createdAt = {
        ...(filters.createdFrom ? { gte: filters.createdFrom } : {}),
        ...(filters.createdTo ? { lte: filters.createdTo } : {}),
      };
    }
    if (filters.q) {
      where.OR = [
        { name: { contains: filters.q, mode: 'insensitive' } },
        { legalName: { contains: filters.q, mode: 'insensitive' } },
        { taxId: { contains: filters.q, mode: 'insensitive' } },
        { email: { contains: filters.q, mode: 'insensitive' } },
        { phone: { contains: filters.q, mode: 'insensitive' } },
        { tags: { has: filters.q } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: filters.skip ?? 0,
        take: filters.take ?? 50,
      }),
      this.prisma.customer.count({ where }),
    ]);
    return { items, total };
  }

  async exportAll(organizationId: string, filters: CustomerSearchFilters): Promise<Customer[]> {
    const { items } = await this.search(organizationId, { ...filters, skip: 0, take: 1_000_000 });
    return items;
  }
}

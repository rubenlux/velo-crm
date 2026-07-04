import { Injectable } from '@nestjs/common';
import { Lead } from '@prisma/client';
import { LeadRepository, LeadSearchFilters } from '../infrastructure/lead.repository';

@Injectable()
export class SearchLeadsUseCase {
  constructor(private readonly leads: LeadRepository) {}

  execute(organizationId: string, filters: LeadSearchFilters): Promise<{ items: Lead[]; total: number }> {
    return this.leads.search(organizationId, filters);
  }
}

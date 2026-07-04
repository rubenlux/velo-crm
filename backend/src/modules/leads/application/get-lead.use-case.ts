import { Injectable } from '@nestjs/common';
import { Lead } from '@prisma/client';
import { LeadRepository } from '../infrastructure/lead.repository';
import { LeadNotFoundError } from '../domain/errors';

@Injectable()
export class GetLeadUseCase {
  constructor(private readonly leads: LeadRepository) {}

  async execute(organizationId: string, leadId: string): Promise<Lead> {
    const lead = await this.leads.findById(organizationId, leadId);
    if (!lead) {
      throw new LeadNotFoundError();
    }
    return lead;
  }
}

import { Injectable } from '@nestjs/common';
import { OpportunityRepository, OpportunitySearchFilters, OpportunityWithStage } from '../infrastructure/opportunity.repository';

export interface SearchOpportunitiesResult {
  items: OpportunityWithStage[];
  total: number;
  totalValue: number;
  totalWeightedValue: number;
}

@Injectable()
export class SearchOpportunitiesUseCase {
  constructor(private readonly opportunities: OpportunityRepository) {}

  async execute(organizationId: string, filters: OpportunitySearchFilters): Promise<SearchOpportunitiesResult> {
    const { items, total } = await this.opportunities.search(organizationId, filters);
    const totalValue = items.reduce((sum, o) => sum + Number(o.estimatedValue ?? 0), 0);
    const totalWeightedValue = items.reduce((sum, o) => sum + Number(o.estimatedValue ?? 0) * ((o.probability ?? 0) / 100), 0);
    return { items, total, totalValue, totalWeightedValue };
  }
}

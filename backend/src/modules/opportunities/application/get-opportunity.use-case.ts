import { Injectable } from '@nestjs/common';
import { OpportunityRepository, OpportunityWithStage } from '../infrastructure/opportunity.repository';
import { OpportunityNotFoundError } from '../domain/errors';

export type OpportunityWithWeightedValue = OpportunityWithStage & { weightedValue: number | null };

// weightedValue = estimatedValue * probability / 100, calculado, no persistido
// (research.md #7).
export function withWeightedValue(opportunity: OpportunityWithStage): OpportunityWithWeightedValue {
  const weightedValue =
    opportunity.estimatedValue !== null && opportunity.probability !== null
      ? Number(opportunity.estimatedValue) * (opportunity.probability / 100)
      : null;
  return { ...opportunity, weightedValue };
}

@Injectable()
export class GetOpportunityUseCase {
  constructor(private readonly opportunities: OpportunityRepository) {}

  async execute(organizationId: string, opportunityId: string): Promise<OpportunityWithWeightedValue> {
    const opportunity = await this.opportunities.findById(organizationId, opportunityId);
    if (!opportunity) {
      throw new OpportunityNotFoundError();
    }
    return withWeightedValue(opportunity);
  }
}

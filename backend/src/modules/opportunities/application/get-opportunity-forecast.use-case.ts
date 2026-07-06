import { Injectable } from '@nestjs/common';
import { OpportunityRepository } from '../infrastructure/opportunity.repository';

export interface OpportunityForecast {
  month: number;
  quarter: number;
  year: number;
  byOwner: { ownerUserId: string; value: number }[];
}

function isSameMonth(date: Date, now: Date): boolean {
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}
function isSameQuarter(date: Date, now: Date): boolean {
  return date.getFullYear() === now.getFullYear() && Math.floor(date.getMonth() / 3) === Math.floor(now.getMonth() / 3);
}
function isSameYear(date: Date, now: Date): boolean {
  return date.getFullYear() === now.getFullYear();
}

// Solo Oportunidades Abierta con estimatedCloseDate — las que no la tienen quedan
// excluidas del forecast por período (edge case de spec.md), sin bloquear su gestión
// normal en el pipeline. Agregación en vivo (research.md #13).
@Injectable()
export class GetOpportunityForecastUseCase {
  constructor(private readonly opportunities: OpportunityRepository) {}

  async execute(organizationId: string): Promise<OpportunityForecast> {
    const all = await this.opportunities.findAllForAggregation(organizationId);
    const now = new Date();
    const forecastable = all.filter((o) => o.state === 'Abierta' && o.estimatedCloseDate !== null);

    const sumValue = (opportunities: typeof forecastable) => opportunities.reduce((sum, o) => sum + Number(o.estimatedValue ?? 0), 0);

    const month = sumValue(forecastable.filter((o) => isSameMonth(o.estimatedCloseDate!, now)));
    const quarter = sumValue(forecastable.filter((o) => isSameQuarter(o.estimatedCloseDate!, now)));
    const year = sumValue(forecastable.filter((o) => isSameYear(o.estimatedCloseDate!, now)));

    const byOwnerMap = new Map<string, number>();
    for (const o of forecastable) {
      if (!o.ownerUserId) continue;
      byOwnerMap.set(o.ownerUserId, (byOwnerMap.get(o.ownerUserId) ?? 0) + Number(o.estimatedValue ?? 0));
    }

    return {
      month,
      quarter,
      year,
      byOwner: [...byOwnerMap.entries()].map(([ownerUserId, value]) => ({ ownerUserId, value })),
    };
  }
}

import { Injectable } from '@nestjs/common';
import { OpportunityRepository } from '../infrastructure/opportunity.repository';

export interface OpportunityKpis {
  totalValue: number;
  weightedValue: number;
  openCount: number;
  wonCount: number;
  lostCount: number;
  conversionRate: number | null;
  averageTicket: number | null;
  averageCloseTimeDays: number | null;
  byOwner: { ownerUserId: string; count: number; totalValue: number }[];
  byStage: { stageId: string; stageName: string; count: number; totalValue: number }[];
}

// Agregación en vivo (research.md #13) — sin caché ni tabla materializada; siempre
// refleja el estado actual.
@Injectable()
export class GetOpportunityKpisUseCase {
  constructor(private readonly opportunities: OpportunityRepository) {}

  async execute(organizationId: string): Promise<OpportunityKpis> {
    const all = await this.opportunities.findAllForAggregation(organizationId);

    const open = all.filter((o) => o.state === 'Abierta');
    const won = all.filter((o) => o.state === 'Ganada');
    const lost = all.filter((o) => o.state === 'Perdida');

    const totalValue = open.reduce((sum, o) => sum + Number(o.estimatedValue ?? 0), 0);
    const weightedValue = open.reduce((sum, o) => sum + Number(o.estimatedValue ?? 0) * ((o.probability ?? 0) / 100), 0);

    const closedCount = won.length + lost.length;
    const conversionRate = closedCount > 0 ? won.length / closedCount : null;
    const averageTicket = won.length > 0 ? won.reduce((sum, o) => sum + Number(o.estimatedValue ?? 0), 0) / won.length : null;

    const closeTimes = won
      .map((o) => (o.updatedAt.getTime() - o.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      .filter((days) => days >= 0);
    const averageCloseTimeDays = closeTimes.length > 0 ? closeTimes.reduce((sum, d) => sum + d, 0) / closeTimes.length : null;

    const byOwnerMap = new Map<string, { count: number; totalValue: number }>();
    for (const o of all) {
      if (!o.ownerUserId) continue;
      const entry = byOwnerMap.get(o.ownerUserId) ?? { count: 0, totalValue: 0 };
      entry.count += 1;
      entry.totalValue += Number(o.estimatedValue ?? 0);
      byOwnerMap.set(o.ownerUserId, entry);
    }

    const byStageMap = new Map<string, { stageName: string; count: number; totalValue: number }>();
    for (const o of all) {
      const entry = byStageMap.get(o.stageId) ?? { stageName: o.stage.name, count: 0, totalValue: 0 };
      entry.count += 1;
      entry.totalValue += Number(o.estimatedValue ?? 0);
      byStageMap.set(o.stageId, entry);
    }

    return {
      totalValue,
      weightedValue,
      openCount: open.length,
      wonCount: won.length,
      lostCount: lost.length,
      conversionRate,
      averageTicket,
      averageCloseTimeDays,
      byOwner: [...byOwnerMap.entries()].map(([ownerUserId, v]) => ({ ownerUserId, ...v })),
      byStage: [...byStageMap.entries()].map(([stageId, v]) => ({ stageId, ...v })),
    };
  }
}

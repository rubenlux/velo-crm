import { OrganizationPlan } from '@prisma/client';

export interface PlanLimits {
  maxUsers: number;
  availableModules: string[];
}

export const PLAN_CATALOG: Record<OrganizationPlan, PlanLimits> = {
  Free: {
    maxUsers: 3,
    availableModules: ['crm'],
  },
  Pro: {
    maxUsers: 25,
    availableModules: ['crm', 'agenda', 'facturacion'],
  },
  Enterprise: {
    maxUsers: Number.MAX_SAFE_INTEGER,
    availableModules: ['crm', 'agenda', 'facturacion', 'inventario', 'rrhh', 'automatizaciones'],
  },
};

export function getPlanLimits(plan: OrganizationPlan): PlanLimits {
  return PLAN_CATALOG[plan];
}

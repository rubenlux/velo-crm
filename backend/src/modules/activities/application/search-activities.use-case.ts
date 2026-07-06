import { Injectable } from '@nestjs/common';
import { ActivityRepository, ActivitySearchFilters, ActivityWithType } from '../infrastructure/activity.repository';

export interface SearchActivitiesResult {
  items: ActivityWithType[];
  total: number;
}

// Reutilizado por el frontend de Customer/Contact/Lead/Opportunity para componer
// su propia línea de tiempo (research.md #13) — sin endpoint nuevo para eso.
@Injectable()
export class SearchActivitiesUseCase {
  constructor(private readonly activities: ActivityRepository) {}

  async execute(organizationId: string, filters: ActivitySearchFilters): Promise<SearchActivitiesResult> {
    const { items, total } = await this.activities.search(organizationId, filters);
    return { items, total };
  }
}

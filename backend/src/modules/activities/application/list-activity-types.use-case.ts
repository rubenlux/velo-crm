import { Injectable } from '@nestjs/common';
import { ActivityType } from '@prisma/client';
import { ActivityTypeRepository } from '../infrastructure/activity-type.repository';

@Injectable()
export class ListActivityTypesUseCase {
  constructor(private readonly activityTypes: ActivityTypeRepository) {}

  execute(organizationId: string): Promise<ActivityType[]> {
    return this.activityTypes.findByOrganizationId(organizationId);
  }
}

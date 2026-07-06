import { Injectable } from '@nestjs/common';
import { ActivityRepository, ActivityWithType } from '../infrastructure/activity.repository';
import { ActivityNotFoundError } from '../domain/errors';

@Injectable()
export class GetActivityUseCase {
  constructor(private readonly activities: ActivityRepository) {}

  async execute(organizationId: string, activityId: string): Promise<ActivityWithType> {
    const activity = await this.activities.findById(organizationId, activityId);
    if (!activity) {
      throw new ActivityNotFoundError();
    }
    return activity;
  }
}

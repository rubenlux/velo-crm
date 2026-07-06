import { Injectable } from '@nestjs/common';
import { ActivityType } from '@prisma/client';
import { ActivityTypeRepository } from '../infrastructure/activity-type.repository';

export interface CreateActivityTypeInput {
  organizationId: string;
  name: string;
}

@Injectable()
export class CreateActivityTypeUseCase {
  constructor(private readonly activityTypes: ActivityTypeRepository) {}

  execute(input: CreateActivityTypeInput): Promise<ActivityType> {
    return this.activityTypes.create({ organizationId: input.organizationId, name: input.name });
  }
}

import { Injectable } from '@nestjs/common';
import { ActivityType } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class ActivityTypeRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByName(organizationId: string | null, name: string): Promise<ActivityType | null> {
    return this.prisma.activityType.findFirst({ where: { organizationId, name } });
  }

  // Defaults compartidos (organizationId = null) + custom de esta Organization
  // (research.md #3).
  findByOrganizationId(organizationId: string): Promise<ActivityType[]> {
    return this.prisma.activityType.findMany({
      where: { OR: [{ organizationId: null }, { organizationId }] },
      orderBy: { name: 'asc' },
    });
  }

  // Scoped por organizationId (o default compartido) en la query misma — mismo
  // patrón que Role.organizationId (spec 007).
  async findById(organizationId: string, activityTypeId: string): Promise<ActivityType | null> {
    const type = await this.prisma.activityType.findUnique({ where: { id: activityTypeId } });
    if (!type) return null;
    if (type.organizationId !== null && type.organizationId !== organizationId) return null;
    return type;
  }

  create(data: { organizationId: string | null; name: string; isDefault?: boolean }): Promise<ActivityType> {
    return this.prisma.activityType.create({ data });
  }
}

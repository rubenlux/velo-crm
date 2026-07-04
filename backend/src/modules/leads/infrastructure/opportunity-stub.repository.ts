import { Injectable } from '@nestjs/common';
import { Opportunity, Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

type Db = Pick<PrismaService, 'opportunity'>;

/**
 * Deliberately narrow (create-only) repository for the `Opportunity` table.
 *
 * `Opportunity` is conceptually owned by spec 011 (Opportunities), not yet
 * implemented — this repository exists only so Lead conversion (US3, research.md #10)
 * can create the row it's required to produce. When spec 011 is implemented, its
 * `OpportunitiesModule` becomes the real owner of this table (with its own repository
 * covering read/update/search/KPIs), and `LeadsModule` switches to import and use
 * that module's exported repository instead of this stub — same "module exports its
 * repository" mechanism already used between `customers` and `contacts`.
 */
@Injectable()
export class OpportunityStubRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.OpportunityUncheckedCreateInput, db: Db = this.prisma): Promise<Opportunity> {
    return db.opportunity.create({ data });
  }
}

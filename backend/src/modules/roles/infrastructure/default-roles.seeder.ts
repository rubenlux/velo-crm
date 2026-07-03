import { Injectable, OnModuleInit } from '@nestjs/common';
import { RoleRepository } from './role.repository';
import { DEFAULT_ROLE_PERMISSIONS } from './permission-catalog';

/**
 * Idempotently seeds the 8 non-Propietario default Roles as shared, platform-wide
 * rows (organizationId = null) on every application boot — not a one-time data
 * migration, so it survives resetDatabase() in tests without a separate manual seed
 * step (research.md #2). Re-syncs permissions on every boot so an existing default
 * Role stays aligned with permission-catalog.ts as the catalog grows.
 */
@Injectable()
export class DefaultRolesSeeder implements OnModuleInit {
  constructor(private readonly roles: RoleRepository) {}

  async onModuleInit(): Promise<void> {
    await this.seed();
  }

  async seed(): Promise<void> {
    for (const [name, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      const existing = await this.roles.findByName(null, name);
      if (existing) {
        await this.roles.update(existing.id, { permissions });
        continue;
      }
      await this.roles.create({ organizationId: null, name, isDefault: true, permissions });
    }
  }
}

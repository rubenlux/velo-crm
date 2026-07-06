import { Injectable, OnModuleInit } from '@nestjs/common';
import { ActivityTypeRepository } from './activity-type.repository';

// Catálogo por defecto de FR-010, seedeado idempotentemente como filas compartidas
// (organizationId = null) en cada boot — mismo patrón que DefaultRolesSeeder
// (spec 007, research.md #3 de esta spec).
const DEFAULT_ACTIVITY_TYPES = [
  'Llamada',
  'Reunión',
  'Correo electrónico',
  'Videollamada',
  'Nota',
  'Visita',
  'Mensaje',
  'Seguimiento',
  'Presentación',
  'Demostración',
  'Capacitación',
  'Otro',
];

@Injectable()
export class DefaultActivityTypesSeeder implements OnModuleInit {
  constructor(private readonly activityTypes: ActivityTypeRepository) {}

  async onModuleInit(): Promise<void> {
    await this.seed();
  }

  async seed(): Promise<void> {
    for (const name of DEFAULT_ACTIVITY_TYPES) {
      const existing = await this.activityTypes.findByName(null, name);
      if (existing) continue;
      await this.activityTypes.create({ organizationId: null, name, isDefault: true });
    }
  }
}

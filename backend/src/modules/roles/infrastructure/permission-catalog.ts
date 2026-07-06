// Static Permission catalog (spec 007-roles-permissions, research.md #5). Not
// persisted — Permission is a code-level concept, not a table (data-model.md).
// Declares permissions for CRM-domain resources that don't have real endpoints yet
// (specs 008+) so default roles like "Ventas"/"Contabilidad" aren't empty; no
// controller enforces these until the corresponding spec is implemented.

export interface PermissionDefinition {
  key: string;
  // null = platform-level permission, not gated by Organization.enabledModules
  // (spec 005). A concrete value must match one of PLAN_CATALOG's module keys.
  module: string | null;
}

function crud(resource: string, module: string): PermissionDefinition[] {
  return ['read', 'create', 'update', 'delete'].map((action) => ({ key: `${resource}.${action}`, module }));
}

const PLATFORM_PERMISSIONS: PermissionDefinition[] = [
  { key: 'organization.manage', module: null },
  { key: 'user.manage', module: null },
  { key: 'role.manage', module: null },
];

const CRM_PERMISSIONS: PermissionDefinition[] = [
  ...crud('customer', 'crm'),
  ...crud('contact', 'crm'),
  ...crud('lead', 'crm'),
  ...crud('opportunity', 'crm'),
  // Spec 011: primeras permission keys de esta Fase que no son CRUD genérico —
  // editar una Opportunity Ganada (RN-005) y configurar las etapas de un Pipeline
  // (FR-004, "un Administrador configura") exigen un nivel distinto del
  // opportunity.update normal (research.md #6 de spec 011).
  { key: 'opportunity.edit_won', module: 'crm' },
  { key: 'opportunity.manage_pipeline', module: 'crm' },
  ...crud('activity', 'crm'),
  // Spec 012: configurar tipos custom de Activity es una acción de administración
  // de catálogo compartido, no CRUD normal de Activities individuales — mismo
  // criterio que opportunity.manage_pipeline (spec 011, research.md #6 de esa
  // spec / #4 de spec 012).
  { key: 'activity.manage_types', module: 'crm' },
];

const AGENDA_PERMISSIONS: PermissionDefinition[] = [
  ...crud('task', 'agenda'),
  ...crud('calendar', 'agenda'),
];

const FACTURACION_PERMISSIONS: PermissionDefinition[] = [
  ...crud('quote', 'facturacion'),
  ...crud('invoice', 'facturacion'),
  ...crud('payment', 'facturacion'),
];

const INVENTARIO_PERMISSIONS: PermissionDefinition[] = [
  ...crud('product', 'inventario'),
  ...crud('category', 'inventario'),
  { key: 'inventory.read', module: 'inventario' },
  { key: 'inventory.update', module: 'inventario' },
  ...crud('supplier', 'inventario'),
  ...crud('purchase', 'inventario'),
];

const RRHH_PERMISSIONS: PermissionDefinition[] = [...crud('employee', 'rrhh')];

const AUTOMATIZACIONES_PERMISSIONS: PermissionDefinition[] = [...crud('workflow', 'automatizaciones')];

export const PERMISSION_CATALOG: PermissionDefinition[] = [
  ...PLATFORM_PERMISSIONS,
  ...CRM_PERMISSIONS,
  ...AGENDA_PERMISSIONS,
  ...FACTURACION_PERMISSIONS,
  ...INVENTARIO_PERMISSIONS,
  ...RRHH_PERMISSIONS,
  ...AUTOMATIZACIONES_PERMISSIONS,
];

export function isKnownPermission(key: string): boolean {
  return PERMISSION_CATALOG.some((permission) => permission.key === key);
}

export function permissionsByModule(enabledModules: string[]): PermissionDefinition[] {
  const enabled = new Set(enabledModules);
  return PERMISSION_CATALOG.filter((permission) => permission.module === null || enabled.has(permission.module));
}

function byResource(resources: string[], suffix?: string): string[] {
  return PERMISSION_CATALOG.map((permission) => permission.key).filter((key) => {
    const [resource] = key.split('.');
    return resources.includes(resource) && (!suffix || key.endsWith(`.${suffix}`));
  });
}

// Default permission sets per non-Propietario default Role (FR-001, spec.md
// Assumptions "Reconciliación de catálogo de Roles"). Propietario has no Role row —
// see research.md #3.
export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  Administrador: PERMISSION_CATALOG.map((p) => p.key).filter((key) => key !== 'organization.manage'),
  Gerente: [
    ...byResource(['customer', 'contact', 'lead', 'opportunity', 'activity', 'task', 'calendar']).filter(
      (key) => key !== 'opportunity.manage_pipeline' && key !== 'activity.manage_types',
    ),
    ...byResource(['quote', 'invoice', 'payment', 'product', 'inventory'], 'read'),
  ],
  Ventas: [
    ...byResource(['lead', 'opportunity', 'activity', 'task', 'calendar']).filter(
      (key) => key !== 'opportunity.edit_won' && key !== 'opportunity.manage_pipeline' && key !== 'activity.manage_types',
    ),
    ...byResource(['customer', 'contact'], 'read'),
    ...byResource(['customer', 'contact'], 'create'),
    ...byResource(['customer', 'contact'], 'update'),
  ],
  Soporte: [
    ...byResource(['activity', 'task']).filter((key) => key !== 'activity.manage_types'),
    ...byResource(['customer', 'contact', 'calendar'], 'read'),
  ],
  Contabilidad: [...byResource(['quote', 'invoice', 'payment']), ...byResource(['customer'], 'read')],
  Inventario: [...byResource(['product', 'category', 'supplier', 'purchase']), 'inventory.read', 'inventory.update'],
  RRHH: [...byResource(['employee'])],
  Lector: PERMISSION_CATALOG.filter((p) => p.key.endsWith('.read')).map((p) => p.key),
};

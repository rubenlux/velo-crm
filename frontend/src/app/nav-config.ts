import type { IconName } from '../lib/icons';

export interface NavItem {
  id: string;
  label: string;
  icon: IconName;
  /** Path suffix relative to /organizations/:organizationId (no leading slash; '' = index/dashboard) */
  route: string;
  badge?: string;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

// Ported from Diseño/_template.html's `rawGroups` (~line 1538 of the decoded Claude
// Design export). Route targets are adapted from the mock's own shortcuts: `clientes`/
// `contactos`/`prospectos`/`crm`/`oportunidades`/`actividades` get real list/detail
// pages here (specs 008-012 are implemented) instead of the mock's shared Kanban
// screen or the mock calendar; everything else without a real backend spec falls
// back to the generic Module page.
export const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Principal',
    items: [{ id: 'dashboard', label: 'Panel', icon: 'dashboard', route: '' }],
  },
  {
    title: 'CRM',
    items: [
      { id: 'crm', label: 'Pipeline CRM', icon: 'trending', route: 'pipeline', badge: '12' },
      { id: 'clientes', label: 'Clientes', icon: 'users', route: 'customers' },
      { id: 'contactos', label: 'Contactos', icon: 'contact', route: 'contacts' },
      { id: 'prospectos', label: 'Prospectos', icon: 'target', route: 'leads' },
      { id: 'oportunidades', label: 'Oportunidades', icon: 'trending', route: 'pipeline' },
    ],
  },
  {
    title: 'Ventas',
    items: [
      { id: 'cotizaciones', label: 'Cotizaciones', icon: 'file', route: 'm/cotizaciones' },
      { id: 'facturacion', label: 'Facturación', icon: 'receipt', route: 'm/facturacion', badge: '4' },
      { id: 'pagos', label: 'Pagos', icon: 'card', route: 'm/pagos' },
    ],
  },
  {
    title: 'Operación',
    items: [
      { id: 'productos', label: 'Productos', icon: 'pkg', route: 'm/productos' },
      { id: 'categorias', label: 'Categorías', icon: 'tag', route: 'm/categorias' },
      { id: 'inventario', label: 'Inventario', icon: 'layers', route: 'm/inventario' },
      { id: 'compras', label: 'Compras', icon: 'cart', route: 'm/compras' },
      { id: 'proveedores', label: 'Proveedores', icon: 'truck', route: 'm/proveedores' },
    ],
  },
  {
    title: 'Trabajo',
    items: [
      { id: 'calendario', label: 'Calendario', icon: 'calendar', route: 'calendar' },
      { id: 'actividades', label: 'Actividades', icon: 'activity', route: 'activities' },
      { id: 'tareas', label: 'Tareas', icon: 'check', route: 'tasks', badge: '8' },
      { id: 'workflows', label: 'Workflows', icon: 'workflow', route: 'm/workflows' },
      { id: 'documentos', label: 'Documentos', icon: 'folder', route: 'm/documentos' },
    ],
  },
  {
    title: 'Inteligencia',
    items: [{ id: 'reportes', label: 'Reportes', icon: 'chart', route: 'reports' }],
  },
  {
    title: 'Administración',
    items: [
      { id: 'config', label: 'Configuración', icon: 'gear', route: 'settings/perfil' },
      { id: 'usuarios', label: 'Usuarios', icon: 'user', route: 'settings/equipo' },
      { id: 'roles', label: 'Roles', icon: 'shield', route: 'settings/roles' },
      { id: 'organizaciones', label: 'Organizaciones', icon: 'building', route: 'settings/organizacion' },
      { id: 'ds', label: 'Guía visual', icon: 'sparkles', route: 'design-system' },
    ],
  },
];

/** Builds `/organizations/:organizationId/<suffix>`, handling the empty (dashboard) suffix. */
export function navPath(organizationId: string, routeSuffix: string): string {
  return routeSuffix ? `/organizations/${organizationId}/${routeSuffix}` : `/organizations/${organizationId}`;
}

export function findNavItemBySuffix(pathSuffix: string): NavItem | null {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (pathSuffix === item.route || (item.route && pathSuffix.startsWith(`${item.route}/`))) {
        return item;
      }
    }
  }
  return null;
}

export function findNavGroupForItem(item: NavItem): NavGroup | null {
  return NAV_GROUPS.find((g) => g.items.some((i) => i.id === item.id)) ?? null;
}

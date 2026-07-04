import { BadgeTone } from '../../components/ui/Badge';
import { IconName } from '../../lib/icons';

export interface ModuleRow {
  name: string;
  ref: string;
  status: string;
  statusTone: BadgeTone;
  amount: string;
  date: string;
}

export interface ModuleDefinition {
  title: string;
  icon: IconName;
  rows: ModuleRow[];
}

// Placeholder catalog for nav items whose spec (010-026 minus 008/009) isn't
// implemented yet. Purely illustrative sample rows, no API calls — see
// GenericModule.tsx.
export const MODULE_CATALOG: Record<string, ModuleDefinition> = {
  cotizaciones: {
    title: 'Cotizaciones',
    icon: 'file',
    rows: [
      { name: 'Cotización · Café Modena', ref: 'COT-0142', status: 'Enviada', statusTone: 'blue', amount: '$68,000', date: '02/07/2026' },
      { name: 'Cotización · Vértice Diseño', ref: 'COT-0141', status: 'Aceptada', statusTone: 'green', amount: '$42,000', date: '28/06/2026' },
      { name: 'Cotización · Bloom Cosmética', ref: 'COT-0140', status: 'Borrador', statusTone: 'neutral', amount: '$38,000', date: '25/06/2026' },
    ],
  },
  facturacion: {
    title: 'Facturación',
    icon: 'receipt',
    rows: [
      { name: 'Factura A-0001-2041', ref: 'FAC-2041', status: 'Pendiente', statusTone: 'amber', amount: '$56,000', date: '01/07/2026' },
      { name: 'Factura A-0001-2040', ref: 'FAC-2040', status: 'Pagada', statusTone: 'green', amount: '$84,000', date: '28/06/2026' },
      { name: 'Factura A-0001-2039', ref: 'FAC-2039', status: 'Vencida', statusTone: 'red', amount: '$12,300', date: '20/06/2026' },
      { name: 'Factura A-0001-2038', ref: 'FAC-2038', status: 'Pagada', statusTone: 'green', amount: '$21,900', date: '15/06/2026' },
    ],
  },
  pagos: {
    title: 'Pagos',
    icon: 'card',
    rows: [
      { name: 'Pago · Nordika Studios', ref: 'PAY-0891', status: 'Acreditado', statusTone: 'green', amount: '$12,300', date: '03/07/2026' },
      { name: 'Pago · Grupo Halcón', ref: 'PAY-0890', status: 'Procesando', statusTone: 'amber', amount: '$84,000', date: '02/07/2026' },
    ],
  },
  productos: {
    title: 'Productos',
    icon: 'pkg',
    rows: [
      { name: 'Teclado mecánico Pro', ref: 'KB-2210', status: 'Activo', statusTone: 'green', amount: '$45,000', date: '—' },
      { name: 'Monitor 27" 4K', ref: 'MN-4027', status: 'Activo', statusTone: 'green', amount: '$210,000', date: '—' },
      { name: 'Webcam 4K Studio', ref: 'WC-4001', status: 'Descontinuado', statusTone: 'neutral', amount: '$38,500', date: '—' },
    ],
  },
  categorias: {
    title: 'Categorías',
    icon: 'tag',
    rows: [
      { name: 'Periféricos', ref: 'CAT-01', status: 'Activa', statusTone: 'green', amount: '18 productos', date: '—' },
      { name: 'Monitores', ref: 'CAT-02', status: 'Activa', statusTone: 'green', amount: '6 productos', date: '—' },
      { name: 'Accesorios', ref: 'CAT-03', status: 'Activa', statusTone: 'green', amount: '24 productos', date: '—' },
    ],
  },
  inventario: {
    title: 'Inventario',
    icon: 'layers',
    rows: [
      { name: 'Teclado mecánico Pro', ref: 'KB-2210', status: 'Stock bajo', statusTone: 'red', amount: '6 unid.', date: '—' },
      { name: 'Monitor 27" 4K', ref: 'MN-4027', status: 'Stock bajo', statusTone: 'amber', amount: '9 unid.', date: '—' },
      { name: 'Dock USB-C 12en1', ref: 'DK-1201', status: 'Stock bajo', statusTone: 'amber', amount: '11 unid.', date: '—' },
    ],
  },
  compras: {
    title: 'Compras',
    icon: 'cart',
    rows: [
      { name: 'Orden de compra · TecnoDistribuidora', ref: 'OC-0331', status: 'Recibida', statusTone: 'green', amount: '$180,000', date: '20/06/2026' },
      { name: 'Orden de compra · ImportTech', ref: 'OC-0330', status: 'En tránsito', statusTone: 'amber', amount: '$95,000', date: '15/06/2026' },
    ],
  },
  proveedores: {
    title: 'Proveedores',
    icon: 'truck',
    rows: [
      { name: 'TecnoDistribuidora SA', ref: 'PROV-014', status: 'Activo', statusTone: 'green', amount: '12 órdenes', date: '—' },
      { name: 'ImportTech SRL', ref: 'PROV-013', status: 'Activo', statusTone: 'green', amount: '7 órdenes', date: '—' },
    ],
  },
  workflows: {
    title: 'Workflows',
    icon: 'workflow',
    rows: [
      { name: 'Notificar oportunidad ganada', ref: 'WF-004', status: 'Activo', statusTone: 'green', amount: '32 ejecuciones', date: '—' },
      { name: 'Recordatorio de factura vencida', ref: 'WF-003', status: 'Pausado', statusTone: 'neutral', amount: '5 ejecuciones', date: '—' },
    ],
  },
  documentos: {
    title: 'Documentos',
    icon: 'folder',
    rows: [
      { name: 'Contrato_2026.pdf', ref: 'DOC-118', status: 'Vigente', statusTone: 'green', amount: '2.1 MB', date: '01/07/2026' },
      { name: 'Propuesta_anual.pdf', ref: 'DOC-117', status: 'Vigente', statusTone: 'green', amount: '840 KB', date: '28/06/2026' },
    ],
  },
};

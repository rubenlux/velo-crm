// Illustrative sample data ported from Diseño/_template.html (~lines 1582-1645 of the
// decoded Claude Design export). This screen has no backing spec yet (Reporting is
// spec 026) — numbers here are the same placeholders as the design mock, not real
// metrics, and should be replaced once spec 026 is implemented.
import { IconName } from '../../lib/icons';

export interface KpiDatum {
  icon: IconName;
  iconColor: string;
  label: string;
  value: string;
  delta: string;
  up: boolean;
  spark: number[];
}

export const KPIS: KpiDatum[] = [
  { icon: 'trending', iconColor: 'var(--accent)', label: 'Ventas del mes', value: '$248,900', delta: '18.2%', up: true, spark: [30, 34, 32, 40, 38, 46, 52] },
  { icon: 'users', iconColor: 'var(--blue)', label: 'Clientes nuevos', value: '142', delta: '9.4%', up: true, spark: [8, 10, 9, 12, 11, 14, 16] },
  { icon: 'receipt', iconColor: 'var(--purple)', label: 'Facturación', value: '$312,400', delta: '12.1%', up: true, spark: [20, 26, 24, 30, 34, 32, 38] },
  { icon: 'card', iconColor: 'var(--green)', label: 'Cobranza', value: '86%', delta: '3.0%', up: true, spark: [70, 74, 78, 80, 82, 84, 86] },
  { icon: 'target', iconColor: 'var(--amber)', label: 'Oport. abiertas', value: '68', delta: '2.8%', up: false, spark: [40, 44, 42, 50, 46, 44, 42] },
  { icon: 'activity', iconColor: 'var(--red)', label: 'Ticket promedio', value: '$4,180', delta: '1.5%', up: false, spark: [46, 44, 45, 42, 43, 41, 40] },
];

export const REVENUE = [120, 145, 132, 168, 150, 182, 205, 224, 210, 238, 226, 249];
export const REVENUE_GOAL = [130, 150, 150, 170, 175, 190, 200, 215, 220, 235, 240, 255];
export const MONTHS = ['Ago', 'Sep', 'Oct', 'Nov', 'Dic', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul'];

export const PIPELINE = [
  { stage: 'Prospecto', count: 24, pct: '100%', amount: '$420K', color: 'linear-gradient(90deg,#5B93EA,#7C6BDD)' },
  { stage: 'Contactado', count: 18, pct: '74%', amount: '$318K', color: 'linear-gradient(90deg,#7C6BDD,#9385E8)' },
  { stage: 'Propuesta', count: 14, pct: '55%', amount: '$262K', color: 'linear-gradient(90deg,var(--accent),var(--accent-hover))' },
  { stage: 'Negociación', count: 8, pct: '34%', amount: '$164K', color: 'linear-gradient(90deg,var(--amber),#E0A63C)' },
  { stage: 'Ganado', count: 4, pct: '18%', amount: '$78K', color: 'linear-gradient(90deg,var(--green),#2FBE7C)' },
];

export const COLLECTION_SEGMENTS = [
  { label: 'Cobrado', pct: 86, color: 'var(--green)', amount: '$268K' },
  { label: 'Por vencer', pct: 9, color: 'var(--amber)', amount: '$28K' },
  { label: 'Vencido', pct: 5, color: 'var(--red)', amount: '$16K' },
];

export const LOW_STOCK = [
  { name: 'Teclado mecánico Pro', sku: 'KB-2210', qty: 6, color: 'var(--red-text)' },
  { name: 'Monitor 27" 4K', sku: 'MN-4027', qty: 9, color: 'var(--amber)' },
  { name: 'Dock USB-C 12en1', sku: 'DK-1201', qty: 11, color: 'var(--amber)' },
  { name: 'Webcam 4K Studio', sku: 'WC-4001', qty: 14, color: 'var(--amber)' },
];

export const RECENT_ACTIVITY = [
  { avatar: 'DL', bg: 'var(--blue-soft)', fg: 'var(--blue)', who: 'Diego León', action: 'cerró la oportunidad con Grupo Halcón por $84,000', time: 'Hace 12 min' },
  { avatar: 'SM', bg: 'var(--purple-soft)', fg: 'var(--purple)', who: 'Sofía Marín', action: 'creó una cotización para Café Modena', time: 'Hace 48 min' },
  { avatar: 'JT', bg: 'var(--green-soft)', fg: 'var(--green-text)', who: 'Javier Torres', action: 'registró un pago de $12,300 de Nordika Studios', time: 'Hace 2 h' },
  { avatar: 'MR', bg: 'var(--accent-soft)', fg: 'var(--accent-text)', who: 'Mariana Rojas', action: 'agregó 3 contactos nuevos a Prospectos', time: 'Hace 3 h' },
];

export const DASH_TASKS = [
  { title: 'Llamada de seguimiento · Halcón', due: '10:30', dueColor: 'var(--red-text)', dueBg: 'var(--red-soft)' },
  { title: 'Revisar propuesta Café Modena', due: '14:00', dueColor: 'var(--red-text)', dueBg: 'var(--red-soft)' },
  { title: 'Enviar factura #2041', due: 'Hoy', dueColor: 'var(--amber)', dueBg: 'var(--amber-soft)' },
  { title: 'Preparar reporte trimestral', due: 'Mañana', dueColor: 'var(--text-2)', dueBg: 'var(--surface-2)' },
];

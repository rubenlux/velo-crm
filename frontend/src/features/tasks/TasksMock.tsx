// Illustrative sample data — Tasks has no backing spec yet (013). Visual-only page
// matching Diseño/_template.html's "TASKS" screen (~line 896).
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { Badge, BadgeTone } from '../../components/ui/Badge';
import { Icon } from '../../lib/icons';

interface TaskItem {
  title: string;
  done: boolean;
  prio: string;
  prioTone: BadgeTone;
  ownerInitials: string;
  due: string;
  dueColor: string;
}

const GROUPS: { title: string; tasks: TaskItem[] }[] = [
  {
    title: 'Vencen hoy',
    tasks: [
      { title: 'Llamada de seguimiento · Grupo Halcón', done: false, prio: 'Alta', prioTone: 'red', ownerInitials: 'DL', due: '10:30', dueColor: 'var(--red-text)' },
      { title: 'Revisar propuesta Café Modena', done: false, prio: 'Alta', prioTone: 'red', ownerInitials: 'SM', due: '14:00', dueColor: 'var(--red-text)' },
      { title: 'Enviar factura #2041', done: false, prio: 'Media', prioTone: 'amber', ownerInitials: 'JT', due: 'Hoy', dueColor: 'var(--amber)' },
    ],
  },
  {
    title: 'Esta semana',
    tasks: [
      { title: 'Preparar reporte trimestral', done: false, prio: 'Media', prioTone: 'amber', ownerInitials: 'MR', due: 'Mañana', dueColor: 'var(--text-2)' },
      { title: 'Actualizar catálogo de productos', done: false, prio: 'Baja', prioTone: 'neutral', ownerInitials: 'LP', due: 'Vie', dueColor: 'var(--text-2)' },
      { title: 'Renovar contrato Nordika Studios', done: false, prio: 'Alta', prioTone: 'red', ownerInitials: 'JT', due: 'Vie', dueColor: 'var(--text-2)' },
    ],
  },
  {
    title: 'Completadas',
    tasks: [
      { title: 'Onboarding cliente Bloom Cosmética', done: true, prio: 'Media', prioTone: 'amber', ownerInitials: 'SM', due: 'Ayer', dueColor: 'var(--text-3)' },
      { title: 'Enviar cotización Vértice Diseño', done: true, prio: 'Baja', prioTone: 'neutral', ownerInitials: 'MR', due: 'Ayer', dueColor: 'var(--text-3)' },
    ],
  },
];

export function TasksMock() {
  return (
    <div className="mx-auto max-w-[920px] px-[30px] py-6">
      <div className="mb-[22px] flex items-end justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight">Tareas</h1>
          <p className="mt-1 text-[13px] text-text-2">8 pendientes · 3 vencen hoy</p>
        </div>
        <Button variant="primary" icon={<Icon name="plus" size={15} />}>
          Nueva tarea
        </Button>
      </div>

      {GROUPS.map((group) => (
        <div key={group.title} className="mb-6">
          <div className="mb-2.5 flex items-center gap-2">
            <span className="text-[13px] font-extrabold">{group.title}</span>
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-text-3">{group.tasks.length}</span>
          </div>
          <Card className="overflow-hidden">
            {group.tasks.map((task) => (
              <div key={task.title} className="flex items-center gap-3.5 border-b border-border px-4 py-3.5 last:border-b-0">
                <span
                  className={`flex h-[19px] w-[19px] flex-shrink-0 items-center justify-center rounded-md border-[1.8px] ${
                    task.done ? 'border-accent bg-accent text-white' : 'border-border-strong'
                  }`}
                >
                  {task.done && <Icon name="check" size={11} />}
                </span>
                <span className={`flex-1 text-[13.5px] font-semibold ${task.done ? 'text-text-3 line-through' : ''}`}>{task.title}</span>
                <Badge tone={task.prioTone}>{task.prio}</Badge>
                <Avatar initials={task.ownerInitials} tone="blue" size="sm" />
                <span className="w-[52px] text-right text-xs font-bold" style={{ color: task.dueColor }}>
                  {task.due}
                </span>
              </div>
            ))}
          </Card>
        </div>
      ))}
    </div>
  );
}

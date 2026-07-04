import { Icon } from '../../lib/icons';
import { Card } from './Card';

export interface TimelineEntryLike {
  type: 'audit' | 'edit';
  occurredAt: string;
  actorUserId: string | null;
  detail: unknown;
}

function describe(entry: TimelineEntryLike): { title: string; icon: 'file' | 'check' | 'trending' | 'x' } {
  if (entry.type === 'edit') {
    const changes = (entry.detail as { changes: Record<string, { before: unknown; after: unknown }> }).changes;
    return { title: `Editado: ${Object.keys(changes).join(', ')}`, icon: 'file' };
  }
  const { action } = entry.detail as { action: string };
  const labels: Record<string, string> = {
    CustomerCreated: 'Creado',
    CustomerUpdated: 'Actualizado',
    CustomerArchived: 'Archivado',
    CustomerRestored: 'Restaurado',
    CustomerMerged: 'Fusionado',
    ContactCreated: 'Creado',
    ContactUpdated: 'Actualizado',
    ContactArchived: 'Archivado',
    ContactRestored: 'Restaurado',
    ContactMerged: 'Fusionado',
    ContactCustomerChanged: 'Transferido a otro Customer',
    ContactPrimaryChanged: 'Contacto principal actualizado',
  };
  return { title: labels[action] ?? action, icon: action.includes('Archived') ? 'x' : action.includes('Created') ? 'check' : 'trending' };
}

export function TimelineList({ entries }: { entries: TimelineEntryLike[] }) {
  if (entries.length === 0) {
    return <p className="text-[13px] text-text-2">Sin eventos todavía.</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      {entries.map((entry, index) => {
        const { title, icon } = describe(entry);
        return (
          <Card key={index} className="flex items-start gap-3.5 px-4 py-3.5">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-surface-2 text-text-2">
              <Icon name={icon} size={15} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-bold">{title}</div>
              <div className="mt-0.5 text-[11px] font-semibold text-text-3">{new Date(entry.occurredAt).toLocaleString()}</div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

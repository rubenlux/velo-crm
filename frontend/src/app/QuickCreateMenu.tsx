import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { navPath } from './nav-config';
import { Icon, IconName } from '../lib/icons';

interface QuickCreateItem {
  label: string;
  icon: IconName;
  color: string;
  route: string;
}

const ITEMS: QuickCreateItem[] = [
  { label: 'Cliente', icon: 'users', color: 'var(--accent)', route: 'customers/new' },
  { label: 'Contacto', icon: 'contact', color: 'var(--blue)', route: 'contacts' },
  { label: 'Oportunidad', icon: 'trending', color: 'var(--purple)', route: 'pipeline' },
  { label: 'Cotización', icon: 'file', color: 'var(--blue)', route: 'm/cotizaciones' },
  { label: 'Factura', icon: 'receipt', color: 'var(--purple)', route: 'm/facturacion' },
  { label: 'Tarea', icon: 'check', color: 'var(--green-text)', route: 'tasks' },
  { label: 'Evento', icon: 'calendar', color: 'var(--amber)', route: 'calendar' },
];

export function QuickCreateMenu() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { organizationId } = useParams<{ organizationId: string }>();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-1.5 text-[13px] font-bold text-white shadow-[0_2px_8px_-2px_rgba(234,99,33,.5)] transition-colors hover:bg-accent-hover"
      >
        <Icon name="plus" size={15} /> Nuevo <Icon name="chevD" size={14} className="opacity-80" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-30 w-[230px] animate-veloPop rounded-2xl border border-border-strong bg-surface p-1.5 shadow-lg">
            <div className="px-2.5 pb-1 pt-1.5 text-[10.5px] font-bold uppercase tracking-wide text-text-3">Crear nuevo</div>
            {ITEMS.map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  setOpen(false);
                  if (organizationId) navigate(navPath(organizationId, item.route));
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-surface-2"
              >
                <span className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-lg bg-surface-2" style={{ color: item.color }}>
                  <Icon name={item.icon} size={15} />
                </span>
                <span className="flex-1 text-[13px] font-semibold">{item.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

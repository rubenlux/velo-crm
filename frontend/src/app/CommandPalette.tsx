import { useParams, useNavigate } from 'react-router-dom';
import { useAppShell } from './AppShellContext';
import { navPath } from './nav-config';
import { Icon, IconName } from '../lib/icons';

interface Command {
  label: string;
  icon: IconName;
  color: string;
  hint?: string;
  route: string;
}

const GROUPS: { title: string; items: Command[] }[] = [
  {
    title: 'Ir a',
    items: [
      { label: 'Panel principal', icon: 'dashboard', color: 'var(--accent)', route: '' },
      { label: 'Clientes', icon: 'users', color: 'var(--blue)', route: 'customers' },
      { label: 'Contactos', icon: 'contact', color: 'var(--blue)', route: 'contacts' },
      { label: 'Pipeline CRM', icon: 'trending', color: 'var(--purple)', route: 'pipeline' },
      { label: 'Tareas', icon: 'check', color: 'var(--green-text)', route: 'tasks' },
      { label: 'Reportes', icon: 'chart', color: 'var(--amber)', route: 'reports' },
      { label: 'Configuración', icon: 'gear', color: 'var(--text-2)', route: 'settings/perfil' },
    ],
  },
  {
    title: 'Acciones rápidas',
    items: [
      { label: 'Crear cliente', icon: 'plus', color: 'var(--accent)', hint: 'C then N', route: 'customers/new' },
      { label: 'Nueva cotización', icon: 'file', color: 'var(--blue)', route: 'm/cotizaciones' },
      { label: 'Emitir factura', icon: 'receipt', color: 'var(--purple)', route: 'm/facturacion' },
    ],
  },
];

export function CommandPalette() {
  const { paletteOpen, closePalette } = useAppShell();
  const { organizationId } = useParams<{ organizationId: string }>();
  const navigate = useNavigate();

  if (!paletteOpen) return null;

  function go(route: string) {
    closePalette();
    if (organizationId) navigate(navPath(organizationId, route));
  }

  return (
    <div
      onClick={closePalette}
      className="fixed inset-0 z-50 flex animate-veloFade items-start justify-center bg-black/45 pt-[12vh] backdrop-blur-sm"
    >
      <div onClick={(e) => e.stopPropagation()} className="w-[min(92vw,600px)] animate-veloPop overflow-hidden rounded-2xl border border-border-strong bg-surface shadow-lg">
        <div className="flex items-center gap-2.5 border-b border-border px-[18px] py-3.5">
          <span className="flex text-text-3">
            <Icon name="search" size={18} />
          </span>
          <input
            autoFocus
            placeholder="Buscar clientes, acciones, módulos…"
            className="flex-1 border-none bg-transparent text-[15px] font-medium text-text outline-none"
          />
          <span className="rounded-md border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-text-3">ESC</span>
        </div>
        <div data-scroll className="max-h-[52vh] overflow-y-auto p-2">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <div className="px-2.5 pb-1 pt-2 text-[10.5px] font-bold uppercase tracking-wide text-text-3">{group.title}</div>
              {group.items.map((item) => (
                <button
                  key={item.label}
                  onClick={() => go(item.route)}
                  className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors hover:bg-surface-2"
                >
                  <span className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-lg bg-surface-2" style={{ color: item.color }}>
                    <Icon name={item.icon} size={16} />
                  </span>
                  <span className="flex-1 text-[13.5px] font-semibold">{item.label}</span>
                  {item.hint && <span className="text-[11px] font-semibold text-text-3">{item.hint}</span>}
                  <span className="flex text-text-3">
                    <Icon name="chevR" size={14} />
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 border-t border-border bg-surface-2 px-4 py-2.5 text-[10.5px] font-semibold text-text-3">
          <span className="flex items-center gap-1.5">
            <kbd className="rounded border border-border bg-surface px-1.5 font-mono">↑↓</kbd> navegar
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="rounded border border-border bg-surface px-1.5 font-mono">↵</kbd> abrir
          </span>
          <div className="flex-1" />
          <span className="flex items-center gap-1.5">
            Impulsado por <b className="text-text-2">VELO AI</b>
          </span>
        </div>
      </div>
    </div>
  );
}

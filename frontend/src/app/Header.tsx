import { useLocation, useParams } from 'react-router-dom';
import { useAppShell } from './AppShellContext';
import { findNavItemBySuffix, findNavGroupForItem } from './nav-config';
import { Icon } from '../lib/icons';
import { QuickCreateMenu } from './QuickCreateMenu';

export function Header() {
  const { toggleSidebar, openPalette, toggleTheme, theme } = useAppShell();
  const location = useLocation();
  const { organizationId } = useParams<{ organizationId: string }>();

  const pathSuffix = organizationId ? location.pathname.replace(`/organizations/${organizationId}`, '').replace(/^\//, '') : '';
  const activeItem = findNavItemBySuffix(pathSuffix);
  const activeGroup = activeItem ? findNavGroupForItem(activeItem) : null;

  return (
    <header className="relative z-[5] flex h-[60px] flex-shrink-0 items-center gap-3.5 border-b border-border bg-surface/80 px-5 backdrop-blur-md">
      <button
        onClick={toggleSidebar}
        title="Colapsar barra"
        className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-lg text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
      >
        <Icon name="panel" size={18} />
      </button>

      <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
        {activeGroup && (
          <span className="flex items-center gap-1.5">
            <span className="whitespace-nowrap text-[13.5px] font-semibold text-text-2">{activeGroup.title}</span>
            <span className="flex text-text-3">
              <Icon name="chevR" size={14} />
            </span>
          </span>
        )}
        <span className="whitespace-nowrap text-[13.5px] font-bold text-text">{activeItem?.label ?? 'Panel'}</span>
      </div>

      <div className="flex-1" />

      <button
        onClick={openPalette}
        title="Buscar (⌘K)"
        className="flex h-[34px] w-[34px] items-center justify-center rounded-lg text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
      >
        <Icon name="search" size={17} />
      </button>
      <button
        onClick={toggleTheme}
        title="Cambiar tema"
        className="flex h-[34px] w-[34px] items-center justify-center rounded-lg text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
      >
        <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} />
      </button>
      <button
        title="Notificaciones"
        className="relative flex h-[34px] w-[34px] items-center justify-center rounded-lg text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
      >
        <Icon name="bell" size={17} />
        <span className="absolute right-2 top-[7px] h-[7px] w-[7px] rounded-full border-[1.5px] border-surface bg-accent" />
      </button>
      <button title="Ayuda" className="flex h-[34px] w-[34px] items-center justify-center rounded-lg text-text-2 transition-colors hover:bg-surface-2 hover:text-text">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" />
          <path d="M12 17h.01" />
        </svg>
      </button>
      <div className="mx-0.5 h-[22px] w-px bg-border" />
      <QuickCreateMenu />
    </header>
  );
}

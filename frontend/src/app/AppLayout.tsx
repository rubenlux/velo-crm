import { Navigate, Outlet } from 'react-router-dom';
import { getSession } from '../services/session';
import { AppShellProvider } from './AppShellContext';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CommandPalette } from './CommandPalette';

export function AppLayout() {
  const session = getSession();
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppShellProvider>
      <div className="flex h-screen w-full overflow-hidden bg-bg font-sans text-[14px] leading-[1.45] tracking-[-0.01em] text-text antialiased">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <div className="flex min-h-0 flex-1">
            <main data-scroll className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
              <Outlet />
            </main>
          </div>
        </div>
        <CommandPalette />
      </div>
    </AppShellProvider>
  );
}

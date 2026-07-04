import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { NAV_GROUPS, findNavItemBySuffix, navPath } from './nav-config';
import { useAppShell } from './AppShellContext';
import { Icon } from '../lib/icons';
import { Avatar } from '../components/ui/Avatar';
import { getSession, getActiveOrganizationId, clearSession } from '../services/session';
import { getOrganization } from '../services/organizations-api';
import { getMyProfile, listMyOrganizations } from '../services/users-api';
import { logout } from '../services/auth-api';

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { organizationId } = useParams<{ organizationId: string }>();
  const { openPalette } = useAppShell();
  const session = getSession();

  const pathSuffix = organizationId ? location.pathname.replace(`/organizations/${organizationId}`, '').replace(/^\//, '') : '';
  const activeItem = findNavItemBySuffix(pathSuffix);

  const [orgName, setOrgName] = useState('Mi Organización');
  const [orgPlan, setOrgPlan] = useState('Free');
  const [userName, setUserName] = useState(session?.user.email ?? '');
  const [userRole, setUserRole] = useState('Miembro');
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    if (!session) return;
    const activeOrgId = organizationId ?? getActiveOrganizationId();
    if (activeOrgId) {
      getOrganization(session.accessToken, activeOrgId)
        .then((org) => {
          setOrgName(org.name);
          setOrgPlan(`Plan ${org.plan}`);
        })
        .catch(() => undefined);
      listMyOrganizations(session.accessToken)
        .then((orgs) => {
          const current = orgs.find((o) => o.id === activeOrgId);
          if (current) setUserRole(current.role);
        })
        .catch(() => undefined);
    }
    getMyProfile(session.accessToken)
      .then((profile) => {
        const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ');
        if (name) setUserName(name);
      })
      .catch(() => undefined);
  }, [session, organizationId]);

  const initials = userName
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  async function handleLogout() {
    if (session) {
      await logout(session.accessToken, session.refreshToken).catch(() => undefined);
    }
    clearSession();
    navigate('/login');
  }

  return (
    <aside data-scroll className="flex h-full w-side flex-shrink-0 flex-col overflow-y-auto overflow-x-hidden border-r border-border bg-surface transition-[width] duration-200">
      <div data-brandwrap className="flex h-[60px] flex-shrink-0 items-center gap-2.5 border-b border-border px-4">
        <div className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-[9px] bg-gradient-to-br from-accent to-accent-hover shadow-[0_2px_8px_-1px_rgba(234,99,33,.5)]">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
            <path d="M4 5l6 14 4-9 3 6h3" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div data-hidec className="flex min-w-0 flex-col">
          <span className="text-[15px] font-extrabold tracking-tight">VELO</span>
          <span className="-mt-px text-[10.5px] font-semibold tracking-wide text-text-3">Business OS</span>
        </div>
      </div>

      <div data-hidec className="px-3 pb-1.5 pt-3">
        <button
          onClick={() => navigate('/organizations')}
          className="flex w-full items-center gap-2.5 rounded-[9px] border border-border bg-surface-2 px-2.5 py-2 text-left transition-colors hover:bg-surface-3"
        >
          <Avatar initials={orgName.slice(0, 1).toUpperCase()} tone="purple" size="sm" />
          <div className="flex min-w-0 flex-1 flex-col items-start">
            <span className="max-w-[150px] truncate text-[12.5px] font-bold">{orgName}</span>
            <span className="text-[10px] font-semibold text-text-3">{orgPlan}</span>
          </div>
          <span className="text-text-3">
            <Icon name="chevD" size={14} />
          </span>
        </button>
      </div>

      <div className="px-3 pb-2 pt-1.5">
        <button
          onClick={openPalette}
          data-navitem
          className="flex w-full items-center gap-2.5 rounded-[9px] border border-border px-2.5 py-2 text-text-3 transition-colors hover:border-border-strong hover:text-text-2"
        >
          <Icon name="search" size={16} />
          <span data-hidec className="flex-1 text-left text-[12.5px] text-text-3">
            Buscar o comando…
          </span>
          <span data-hidec className="rounded-[5px] border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-text-3">
            ⌘K
          </span>
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-2.5 pb-3 pt-0.5">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="mt-3">
            <div data-hidec className="px-2 pb-1.5 pt-0.5 text-[10.5px] font-bold uppercase tracking-wide text-text-3">
              {group.title}
            </div>
            {group.items.map((item) => {
              const active = activeItem?.id === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => organizationId && navigate(navPath(organizationId, item.route))}
                  data-navitem
                  title={item.label}
                  className={`relative mb-px flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] transition-colors ${
                    active ? 'bg-surface-2 font-bold text-text' : 'font-semibold text-text-2 hover:bg-surface-2'
                  }`}
                >
                  <span className={`flex flex-shrink-0 ${active ? 'text-accent' : 'text-text-3'}`}>
                    <Icon name={item.icon} size={17} />
                  </span>
                  <span data-hidec className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left">
                    {item.label}
                  </span>
                  {item.badge && (
                    <span
                      data-hidec
                      className={`rounded-full px-1.5 text-[10.5px] font-bold ${active ? 'bg-accent-soft text-accent-text' : 'bg-surface-3 text-text-3'}`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="relative flex-shrink-0 border-t border-border px-3 py-2.5">
        <button
          data-navitem
          onClick={() => setUserMenuOpen((v) => !v)}
          className="flex w-full items-center gap-2.5 rounded-[9px] px-1.5 py-1.5 text-text transition-colors hover:bg-surface-2"
        >
          <Avatar initials={initials || 'U'} gradient="linear-gradient(140deg,#5B93EA,#7C6BDD)" size="md" />
          <div data-hidec className="flex min-w-0 flex-1 flex-col items-start">
            <span className="truncate text-[12.5px] font-bold">{userName}</span>
            <span className="text-[10.5px] font-semibold text-text-3">{userRole}</span>
          </div>
          <span data-hidec className="text-text-3">
            <Icon name="dots" size={16} />
          </span>
        </button>
        {userMenuOpen && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setUserMenuOpen(false)} />
            <div className="absolute bottom-[64px] left-3 right-3 z-30 animate-veloPop overflow-hidden rounded-xl border border-border-strong bg-surface p-1.5 shadow-lg">
              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  if (organizationId) navigate(navPath(organizationId, 'settings/perfil'));
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-semibold transition-colors hover:bg-surface-2"
              >
                <Icon name="gear" size={15} /> Configuración
              </button>
              <button onClick={handleLogout} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-semibold text-red-text transition-colors hover:bg-surface-2">
                <Icon name="x" size={15} /> Cerrar sesión
              </button>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

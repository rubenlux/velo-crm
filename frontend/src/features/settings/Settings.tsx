import { useNavigate, useParams } from 'react-router-dom';
import { useAppShell } from '../../app/AppShellContext';
import { Icon, IconName } from '../../lib/icons';
import { Card } from '../../components/ui/Card';
import { ToggleSwitch } from '../../components/ui/ToggleSwitch';
import { getSession } from '../../services/session';
import { Profile } from '../users/Profile';
import { Preferences } from '../users/Preferences';
import { AccessHistory } from '../users/AccessHistory';
import { Mfa } from '../auth/Mfa';
import { Sessions } from '../auth/Sessions';
import { ChangePassword } from '../auth/ChangePassword';
import { Members } from '../organizations/Members';
import { RolesList } from '../roles/RolesList';
import { AssignRoles } from '../roles/AssignRoles';
import { EffectivePermissions } from '../roles/EffectivePermissions';
import { OrganizationSettings } from '../organizations/OrganizationSettings';
import { PlanBilling } from '../organizations/PlanBilling';

interface SettingsSection {
  id: string;
  label: string;
  icon: IconName;
}

const SECTIONS: SettingsSection[] = [
  { id: 'perfil', label: 'Perfil', icon: 'user' },
  { id: 'apariencia', label: 'Apariencia', icon: 'sun' },
  { id: 'seguridad', label: 'Seguridad', icon: 'shield' },
  { id: 'equipo', label: 'Equipo', icon: 'users' },
  { id: 'roles', label: 'Roles', icon: 'shield' },
  { id: 'organizacion', label: 'Organización', icon: 'building' },
  { id: 'plan', label: 'Plan y facturación', icon: 'card' },
];

export function Settings() {
  const { organizationId, tab = 'perfil' } = useParams<{ organizationId: string; tab: string }>();
  const navigate = useNavigate();
  const session = getSession();
  const { theme, toggleTheme, collapsed, toggleSidebar } = useAppShell();

  if (!session || !organizationId) return null;

  return (
    <div className="mx-auto max-w-[1120px] px-8 py-6">
      <h1 className="mb-6 text-[22px] font-extrabold tracking-tight">Configuración</h1>
      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-[220px_1fr]">
        <nav className="flex flex-col gap-0.5 md:sticky md:top-0">
          {SECTIONS.map((section) => {
            const active = section.id === tab;
            return (
              <button
                key={section.id}
                onClick={() => navigate(`/organizations/${organizationId}/settings/${section.id}`)}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors ${
                  active ? 'bg-surface-2 font-bold text-text' : 'font-semibold text-text-2 hover:bg-surface-2'
                }`}
              >
                <span className={active ? 'text-accent' : 'text-text-3'}>
                  <Icon name={section.icon} size={16} />
                </span>
                {section.label}
              </button>
            );
          })}
        </nav>

        <div className="min-w-0">
          {tab === 'perfil' && (
            <div className="flex flex-col gap-4">
              <Profile />
              <Preferences />
            </div>
          )}
          {tab === 'apariencia' && (
            <Card className="p-6">
              <div className="mb-4 text-[15px] font-extrabold">Apariencia</div>
              <div className="flex items-center justify-between border-b border-border py-3">
                <div>
                  <div className="text-[13px] font-bold">Tema oscuro</div>
                  <div className="text-[12px] text-text-2">Reduce el brillo para sesiones largas.</div>
                </div>
                <ToggleSwitch checked={theme === 'dark'} onChange={toggleTheme} />
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <div className="text-[13px] font-bold">Barra lateral compacta</div>
                  <div className="text-[12px] text-text-2">Muestra solo iconos en la navegación.</div>
                </div>
                <ToggleSwitch checked={collapsed} onChange={toggleSidebar} />
              </div>
            </Card>
          )}
          {tab === 'seguridad' && (
            <div className="flex flex-col gap-4">
              <Mfa accessToken={session.accessToken} />
              <ChangePassword accessToken={session.accessToken} />
              <Sessions accessToken={session.accessToken} />
              <AccessHistory />
            </div>
          )}
          {tab === 'equipo' && <Members />}
          {tab === 'roles' && (
            <div className="flex flex-col gap-4">
              <RolesList />
              <AssignRoles />
              <EffectivePermissions />
            </div>
          )}
          {tab === 'organizacion' && <OrganizationSettings />}
          {tab === 'plan' && <PlanBilling />}
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './features/auth/Login';
import { Register } from './features/auth/Register';
import { ForgotPassword } from './features/auth/ForgotPassword';
import { ResetPassword } from './features/auth/ResetPassword';
import { Home } from './features/auth/Home';
import { Sessions } from './features/auth/Sessions';
import { Mfa } from './features/auth/Mfa';
import { ChangePassword } from './features/auth/ChangePassword';
import { CreateOrganization } from './features/organizations/CreateOrganization';
import { OrganizationSettings } from './features/organizations/OrganizationSettings';
import { Members } from './features/organizations/Members';
import { PlanBilling } from './features/organizations/PlanBilling';
import { Profile } from './features/users/Profile';
import { Preferences } from './features/users/Preferences';
import { OrganizationSwitcher } from './features/users/OrganizationSwitcher';
import { ManageOrgUsers } from './features/users/ManageOrgUsers';
import { AccessHistory } from './features/users/AccessHistory';
import { AssignRoles } from './features/roles/AssignRoles';
import { EffectivePermissions } from './features/roles/EffectivePermissions';
import { RolesList } from './features/roles/RolesList';
import { RoleEditor } from './features/roles/RoleEditor';
import { getSession } from './services/session';

function RequireAuth({ children }: { children: React.ReactElement }) {
  return getSession() ? children : <Navigate to="/login" replace />;
}

function SessionsRoute() {
  const session = getSession();
  return session ? <Sessions accessToken={session.accessToken} /> : <Navigate to="/login" replace />;
}

function MfaRoute() {
  const session = getSession();
  return session ? <Mfa accessToken={session.accessToken} /> : <Navigate to="/login" replace />;
}

function ChangePasswordRoute() {
  const session = getSession();
  return session ? <ChangePassword accessToken={session.accessToken} /> : <Navigate to="/login" replace />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <RequireAuth>
              <Home />
            </RequireAuth>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/sessions" element={<SessionsRoute />} />
        <Route path="/mfa" element={<MfaRoute />} />
        <Route path="/change-password" element={<ChangePasswordRoute />} />
        <Route
          path="/organizations/new"
          element={
            <RequireAuth>
              <CreateOrganization />
            </RequireAuth>
          }
        />
        <Route
          path="/organizations/:organizationId"
          element={
            <RequireAuth>
              <OrganizationSettings />
            </RequireAuth>
          }
        />
        <Route
          path="/organizations/:organizationId/members"
          element={
            <RequireAuth>
              <Members />
            </RequireAuth>
          }
        />
        <Route
          path="/organizations/:organizationId/plan"
          element={
            <RequireAuth>
              <PlanBilling />
            </RequireAuth>
          }
        />
        <Route
          path="/profile"
          element={
            <RequireAuth>
              <Profile />
            </RequireAuth>
          }
        />
        <Route
          path="/preferences"
          element={
            <RequireAuth>
              <Preferences />
            </RequireAuth>
          }
        />
        <Route
          path="/organizations"
          element={
            <RequireAuth>
              <OrganizationSwitcher />
            </RequireAuth>
          }
        />
        <Route
          path="/organizations/:organizationId/manage-users"
          element={
            <RequireAuth>
              <ManageOrgUsers />
            </RequireAuth>
          }
        />
        <Route
          path="/access-history"
          element={
            <RequireAuth>
              <AccessHistory />
            </RequireAuth>
          }
        />
        <Route
          path="/organizations/:organizationId/roles/assign"
          element={
            <RequireAuth>
              <AssignRoles />
            </RequireAuth>
          }
        />
        <Route
          path="/organizations/:organizationId/roles/effective-permissions"
          element={
            <RequireAuth>
              <EffectivePermissions />
            </RequireAuth>
          }
        />
        <Route
          path="/organizations/:organizationId/roles"
          element={
            <RequireAuth>
              <RolesList />
            </RequireAuth>
          }
        />
        <Route
          path="/organizations/:organizationId/roles/new"
          element={
            <RequireAuth>
              <RoleEditor />
            </RequireAuth>
          }
        />
        <Route
          path="/organizations/:organizationId/roles/:roleId/edit"
          element={
            <RequireAuth>
              <RoleEditor />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);

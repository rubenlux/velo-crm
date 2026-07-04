import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './styles/index.css';
import { AppLayout } from './app/AppLayout';
import { RootRedirect } from './app/RootRedirect';
import { Login } from './features/auth/Login';
import { Register } from './features/auth/Register';
import { ForgotPassword } from './features/auth/ForgotPassword';
import { ResetPassword } from './features/auth/ResetPassword';
import { CreateOrganization } from './features/organizations/CreateOrganization';
import { OrganizationSwitcher } from './features/users/OrganizationSwitcher';
import { RoleEditor } from './features/roles/RoleEditor';
import { Dashboard } from './features/dashboard/Dashboard';
import { Pipeline } from './features/pipeline/Pipeline';
import { CustomersList } from './features/customers/CustomersList';
import { CustomerForm } from './features/customers/CustomerForm';
import { CustomerDetail } from './features/customers/CustomerDetail';
import { CustomerTimeline } from './features/customers/CustomerTimeline';
import { MergeCustomers } from './features/customers/MergeCustomers';
import { ImportExportCustomers } from './features/customers/ImportExportCustomers';
import { ContactsList } from './features/contacts/ContactsList';
import { ContactForm } from './features/contacts/ContactForm';
import { ContactDetail } from './features/contacts/ContactDetail';
import { ContactTimeline } from './features/contacts/ContactTimeline';
import { TransferOrMergeContact } from './features/contacts/TransferOrMergeContact';
import { LeadsList } from './features/leads/LeadsList';
import { LeadForm } from './features/leads/LeadForm';
import { LeadDetail } from './features/leads/LeadDetail';
import { LeadTimeline } from './features/leads/LeadTimeline';
import { ConvertLead } from './features/leads/ConvertLead';
import { TasksMock } from './features/tasks/TasksMock';
import { CalendarMock } from './features/calendar/CalendarMock';
import { ReportsMock } from './features/reports/ReportsMock';
import { GenericModule } from './features/module/GenericModule';
import { DesignSystemPage } from './features/design-system/DesignSystemPage';
import { Settings } from './features/settings/Settings';
import { getSession } from './services/session';

function RequireAuth({ children }: { children: React.ReactElement }) {
  return getSession() ? children : <Navigate to="/login" replace />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route path="/" element={<RequireAuth><RootRedirect /></RequireAuth>} />
        <Route
          path="/organizations"
          element={
            <RequireAuth>
              <OrganizationSwitcher />
            </RequireAuth>
          }
        />
        <Route
          path="/organizations/new"
          element={
            <RequireAuth>
              <CreateOrganization />
            </RequireAuth>
          }
        />

        <Route path="/organizations/:organizationId" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="pipeline" element={<Pipeline />} />

          <Route path="customers" element={<CustomersList />} />
          <Route path="customers/new" element={<CustomerForm />} />
          <Route path="customers/merge" element={<MergeCustomers />} />
          <Route path="customers/import-export" element={<ImportExportCustomers />} />
          <Route path="customers/:customerId" element={<CustomerDetail />} />
          <Route path="customers/:customerId/edit" element={<CustomerForm />} />
          <Route path="customers/:customerId/timeline" element={<CustomerTimeline />} />
          <Route path="customers/:customerId/contacts/new" element={<ContactForm />} />

          <Route path="contacts" element={<ContactsList />} />
          <Route path="contacts/:contactId" element={<ContactDetail />} />
          <Route path="contacts/:contactId/edit" element={<ContactForm />} />
          <Route path="contacts/:contactId/timeline" element={<ContactTimeline />} />
          <Route path="contacts/:contactId/transfer-merge" element={<TransferOrMergeContact />} />

          <Route path="leads" element={<LeadsList />} />
          <Route path="leads/new" element={<LeadForm />} />
          <Route path="leads/:leadId" element={<LeadDetail />} />
          <Route path="leads/:leadId/convert" element={<ConvertLead />} />
          <Route path="leads/:leadId/timeline" element={<LeadTimeline />} />

          <Route path="calendar" element={<CalendarMock />} />
          <Route path="tasks" element={<TasksMock />} />
          <Route path="reports" element={<ReportsMock />} />
          <Route path="m/:moduleId" element={<GenericModule />} />
          <Route path="design-system" element={<DesignSystemPage />} />

          <Route path="settings" element={<Settings />} />
          <Route path="settings/:tab" element={<Settings />} />
          <Route path="roles/new" element={<RoleEditor />} />
          <Route path="roles/:roleId/edit" element={<RoleEditor />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);

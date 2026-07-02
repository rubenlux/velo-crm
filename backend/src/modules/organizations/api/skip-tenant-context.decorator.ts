import { SetMetadata } from '@nestjs/common';

export const SKIP_TENANT_CONTEXT_KEY = 'skipTenantContext';

/**
 * Opts a route out of TenantContextGuard (applied class-wide on
 * OrganizationsController — deny-by-default within this controller). Use only for
 * routes that intentionally don't operate on an existing Membership: creating the
 * first Organization, or platform-admin actions gated by PlatformAdminGuard instead.
 */
export const SkipTenantContext = () => SetMetadata(SKIP_TENANT_CONTEXT_KEY, true);

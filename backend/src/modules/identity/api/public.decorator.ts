import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as not requiring authentication. AuthGuard is global
 * (deny-by-default, see AppModule) — this is the only way to opt out.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

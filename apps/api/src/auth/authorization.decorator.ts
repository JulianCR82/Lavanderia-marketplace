import { SetMetadata } from '@nestjs/common';

export const AUTHORIZATION_POLICY = 'auth:authorization-policy';

export type AuthorizationPolicy =
  | { kind: 'customer' }
  | { kind: 'platform'; role: 'PLATFORM_ADMIN' }
  | { kind: 'laundry'; roles: readonly ('OWNER' | 'STAFF')[] };

export const RequirePlatformRole = () =>
  SetMetadata(AUTHORIZATION_POLICY, {
    kind: 'platform',
    role: 'PLATFORM_ADMIN',
  } satisfies AuthorizationPolicy);

export const RequireCustomerAccount = () =>
  SetMetadata(AUTHORIZATION_POLICY, {
    kind: 'customer',
  } satisfies AuthorizationPolicy);

export const RequireLaundryRole = (...roles: ('OWNER' | 'STAFF')[]) =>
  SetMetadata(AUTHORIZATION_POLICY, {
    kind: 'laundry',
    roles,
  } satisfies AuthorizationPolicy);

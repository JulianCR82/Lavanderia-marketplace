import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthorizationGuard } from './authorization.guard';
import type { AuthorizationPolicy } from './authorization.decorator';
import {
  RequireLaundryRole,
  RequirePlatformRole,
} from './authorization.decorator';
import { AccessController } from './access.controller';

describe('AuthorizationGuard', () => {
  const laundryId = '40000000-0000-4000-8000-000000000001';
  const otherLaundryId = '40000000-0000-4000-8000-000000000002';
  let policy: AuthorizationPolicy | undefined;
  let guard: AuthorizationGuard;
  // Read the function only as a metadata key; it is never called unbound.
  const handler = (controller: object, name: string) =>
    Object.getOwnPropertyDescriptor(controller, name)!.value as () => unknown;

  const context = (
    platformRole: 'CUSTOMER' | 'PLATFORM_ADMIN',
    memberships: { laundryId: string; role: 'OWNER' | 'STAFF' }[] = [],
    pathLaundryId = laundryId,
    authenticated = true,
  ) =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          params: { laundryId: pathLaundryId },
          sessionContext: authenticated
            ? { profile: { platformRole, memberships } }
            : undefined,
        }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    policy = undefined;
    const reflector = {
      getAllAndOverride: jest.fn(() => policy),
    } as unknown as Reflector;
    guard = new AuthorizationGuard(reflector);
  });

  it('requires an explicit policy and an authenticated session', () => {
    expect(() => guard.canActivate(context('CUSTOMER'))).toThrow(
      ForbiddenException,
    );
    policy = { kind: 'platform', role: 'PLATFORM_ADMIN' };
    expect(() =>
      guard.canActivate(context('CUSTOMER', [], laundryId, false)),
    ).toThrow(UnauthorizedException);
  });

  it('allows only platform administrators on platform policies', () => {
    policy = { kind: 'platform', role: 'PLATFORM_ADMIN' };
    expect(guard.canActivate(context('PLATFORM_ADMIN'))).toBe(true);
    expect(() => guard.canActivate(context('CUSTOMER'))).toThrow(
      ForbiddenException,
    );
  });

  it.each(['OWNER', 'STAFF'] as const)(
    'allows %s membership only for its laundry',
    (role) => {
      policy = { kind: 'laundry', roles: ['OWNER', 'STAFF'] };
      expect(
        guard.canActivate(
          context('CUSTOMER', [{ laundryId, role }], laundryId),
        ),
      ).toBe(true);
      expect(() =>
        guard.canActivate(
          context('CUSTOMER', [{ laundryId, role }], otherLaundryId),
        ),
      ).toThrow(ForbiddenException);
    },
  );

  it('does not treat a platform administrator as a laundry member or staff as owner', () => {
    policy = { kind: 'laundry', roles: ['OWNER'] };
    expect(() => guard.canActivate(context('PLATFORM_ADMIN'))).toThrow(
      ForbiddenException,
    );
    expect(() =>
      guard.canActivate(context('CUSTOMER', [{ laundryId, role: 'STAFF' }])),
    ).toThrow(ForbiddenException);
  });

  it('reads the real declarative policies on both access routes', () => {
    const realGuard = new AuthorizationGuard(new Reflector());
    const platformContext = {
      ...context('PLATFORM_ADMIN'),
      getClass: () => AccessController,
      getHandler: () => handler(AccessController.prototype, 'platform'),
    } as ExecutionContext;
    expect(realGuard.canActivate(platformContext)).toBe(true);
    const laundryContext = {
      ...context('CUSTOMER', [{ laundryId, role: 'STAFF' }]),
      getClass: () => AccessController,
      getHandler: () => handler(AccessController.prototype, 'laundry'),
    } as ExecutionContext;
    expect(realGuard.canActivate(laundryContext)).toBe(true);
    expect(() =>
      realGuard.canActivate({
        ...context('CUSTOMER'),
        getClass: () => AccessController,
        getHandler: () => handler(AccessController.prototype, 'platform'),
      } as ExecutionContext),
    ).toThrow(ForbiddenException);
  });

  it('supports controller policies and lets a method declare its own narrower scope', () => {
    @RequirePlatformRole()
    class PolicyController {
      platform() {}

      @RequireLaundryRole('OWNER')
      laundry() {}
    }
    const realGuard = new AuthorizationGuard(new Reflector());
    const platformContext = {
      ...context('PLATFORM_ADMIN'),
      getClass: () => PolicyController,
      getHandler: () => handler(PolicyController.prototype, 'platform'),
    } as ExecutionContext;
    expect(realGuard.canActivate(platformContext)).toBe(true);
    expect(() =>
      realGuard.canActivate({
        ...platformContext,
        getHandler: () => handler(PolicyController.prototype, 'laundry'),
      }),
    ).toThrow(ForbiddenException);
  });

  it('denies an empty laundry parameter and an empty set of permitted roles', () => {
    policy = { kind: 'laundry', roles: ['OWNER', 'STAFF'] };
    expect(() =>
      guard.canActivate(
        context('CUSTOMER', [{ laundryId, role: 'OWNER' }], ''),
      ),
    ).toThrow(ForbiddenException);
    policy = { kind: 'laundry', roles: [] };
    expect(() =>
      guard.canActivate(context('CUSTOMER', [{ laundryId, role: 'OWNER' }])),
    ).toThrow(ForbiddenException);
  });
});

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from '../sessions/session.guard';
import { AUTHORIZATION_POLICY } from './authorization.decorator';
import type { AuthorizationPolicy } from './authorization.decorator';

/** Applies server-declared role policies to the already authenticated session. */
@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const policy = this.reflector.getAllAndOverride<AuthorizationPolicy>(
      AUTHORIZATION_POLICY,
      [context.getHandler(), context.getClass()],
    );
    if (!policy) throw new ForbiddenException('Ruta sin política de acceso.');

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const session = request.sessionContext;
    if (!session) throw new UnauthorizedException('Debes iniciar sesión.');

    if (policy.kind === 'customer') {
      if (
        session.profile.accountKind !== 'CUSTOMER' ||
        session.profile.platformRole !== 'CUSTOMER'
      )
        throw new ForbiddenException(
          'Esta función está disponible solo para cuentas de cliente.',
        );
      return true;
    }

    if (policy.kind === 'platform') {
      if (session.profile.platformRole !== policy.role)
        throw new ForbiddenException(
          'Acceso restringido a administración de plataforma.',
        );
      return true;
    }

    const laundryId = request.params.laundryId;
    const membership = session.profile.memberships.find(
      (item) => item.laundryId === laundryId,
    );
    if (!membership || !policy.roles.includes(membership.role))
      throw new ForbiddenException('No tienes acceso a esta lavandería.');
    return true;
  }
}

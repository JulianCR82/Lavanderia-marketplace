import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { SessionService } from './session.service';
import { SessionContext } from './session.types';

const PUBLIC_ROUTE = 'auth:public';
export const Public = () => SetMetadata(PUBLIC_ROUTE, true);
export interface AuthenticatedRequest extends Request {
  sessionContext: SessionContext;
}

export const CurrentSession = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SessionContext =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().sessionContext,
);

/** All routes require a session unless explicitly marked public. */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(
      request.headers.authorization ?? '',
    );
    if (!match)
      throw new UnauthorizedException({
        code: 'SESSION_INVALID',
        message: 'Debes iniciar sesión.',
      });
    request.sessionContext = await this.sessions.resolve(match[1]);
    return true;
  }
}

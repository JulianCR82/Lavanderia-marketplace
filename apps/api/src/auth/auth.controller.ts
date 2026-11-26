import {
  ArgumentsHost,
  Body,
  Catch,
  Controller,
  ExceptionFilter,
  Get,
  Header,
  HttpCode,
  HttpException,
  Post,
  Req,
  UseFilters,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CurrentSession, Public } from '../sessions/session.guard';
import type { SessionContext } from '../sessions/session.types';
import { clientPlatform } from '../sessions/session.types';
import { SessionService } from '../sessions/session.service';
import { AuthService } from './auth.service';
import { AuthLimits } from './auth-limits.service';
import { EmailLoginDto, ProviderDto, ProviderLoginDto } from './auth.dto';

@Catch()
class AuthExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    response.setHeader('Cache-Control', 'no-store');
    if (error instanceof HttpException) {
      response.status(error.getStatus()).json(error.getResponse());
      return;
    }
    response.status(503).json({
      code: 'AUTH_UNAVAILABLE',
      message: 'No pudimos completar el acceso. Intenta más tarde.',
    });
  }
}

@Controller('auth')
@UseFilters(AuthExceptionFilter)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    validationError: { target: false, value: false },
  }),
)
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly limits: AuthLimits,
    private readonly sessions: SessionService,
  ) {}
  private ip(request: Request): string {
    return request.ip ?? request.socket.remoteAddress ?? 'unknown';
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async login(@Body() input: EmailLoginDto, @Req() request: Request) {
    await this.limits.take(this.ip(request), input.email);
    return this.auth.login(
      input,
      clientPlatform(request.headers['x-client-platform']),
    );
  }

  @Public()
  @Post('providers/challenge')
  @Header('Cache-Control', 'no-store')
  async challenge(@Body() input: ProviderDto, @Req() request: Request) {
    await this.limits.take(this.ip(request));
    return this.auth.challenge(input.provider);
  }

  @Public()
  @Post('providers/login')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async providerLogin(
    @Body() input: ProviderLoginDto,
    @Req() request: Request,
  ) {
    await this.limits.take(this.ip(request));
    return this.auth.providerLogin(
      input,
      clientPlatform(request.headers['x-client-platform']),
    );
  }

  @Get('me')
  @Header('Cache-Control', 'no-store')
  me(@CurrentSession() session: SessionContext) {
    return session.profile;
  }

  @Post('logout')
  @HttpCode(204)
  @Header('Cache-Control', 'no-store')
  async logout(@CurrentSession() session: SessionContext): Promise<void> {
    await this.sessions.revoke(session, session.sessionId, 'SESSION_LOGOUT');
  }
}

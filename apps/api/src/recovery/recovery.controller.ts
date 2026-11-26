import {
  ArgumentsHost,
  Body,
  Catch,
  Controller,
  ExceptionFilter,
  Header,
  HttpCode,
  HttpException,
  Post,
  Req,
  UseFilters,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { setTimeout as delay } from 'node:timers/promises';
import { randomInt } from 'node:crypto';
import type { Request, Response } from 'express';
import { Public } from '../sessions/session.guard';
import { RegistrationLimits } from '../registration/registration-limits.service';
import { RecoveryService } from './recovery.service';
import {
  RecoveryIdDto,
  RequestRecoveryDto,
  ResetPasswordDto,
  VerifyRecoveryDto,
} from './recovery.dto';

@Catch()
class RecoveryExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    res.setHeader('Cache-Control', 'no-store');
    if (error instanceof HttpException) {
      res.status(error.getStatus()).json(error.getResponse());
      return;
    }
    res.status(503).json({
      code: 'RECOVERY_UNAVAILABLE',
      message: 'No pudimos completar la recuperación. Intenta más tarde.',
    });
  }
}
@Controller('auth/recovery')
@Public()
@UseFilters(RecoveryExceptionFilter)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    validationError: { target: false, value: false },
  }),
)
export class RecoveryController {
  constructor(
    private readonly recovery: RecoveryService,
    private readonly limits: RegistrationLimits,
  ) {}
  private ip(req: Request) {
    return req.ip ?? req.socket.remoteAddress ?? 'unknown';
  }
  @Post()
  @HttpCode(202)
  @Header('Cache-Control', 'no-store')
  async request(@Body() input: RequestRecoveryDto, @Req() req: Request) {
    // Provider delivery is asynchronous. Also equalize fast DB paths for missing
    // contacts; jitter is only defense in depth, not a substitute for generic SQL/API.
    const until = Date.now() + 200 + randomInt(0, 50);
    try {
      await this.limits.request(this.ip(req));
      return await this.recovery.request(input, this.ip(req));
    } finally {
      await delay(Math.max(0, until - Date.now()));
    }
  }
  @Post('resend')
  @HttpCode(202)
  @Header('Cache-Control', 'no-store')
  async resend(@Body() input: RecoveryIdDto, @Req() req: Request) {
    await this.limits.request(this.ip(req));
    return this.recovery.resend(input.recoveryId, this.ip(req));
  }
  @Post('verify')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async verify(@Body() input: VerifyRecoveryDto, @Req() req: Request) {
    await this.limits.request(this.ip(req));
    return this.recovery.verify(input.recoveryId, input.code);
  }
  @Post('reset')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async reset(@Body() input: ResetPasswordDto, @Req() req: Request) {
    await this.limits.request(this.ip(req));
    return this.recovery.reset(input);
  }
}

import {
  Body,
  Controller,
  HttpCode,
  Header,
  Post,
  Req,
  UsePipes,
  UseFilters,
  ValidationPipe,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  RegistrationIdDto,
  StartRegistrationDto,
  VerifyRegistrationDto,
} from './registration.dto';
import { RegistrationService } from './registration.service';
import { RegistrationLimits } from './registration-limits.service';
import { RegistrationExceptionFilter } from './registration.filter';
import { Public } from '../sessions/session.guard';
import { clientPlatform } from '../sessions/session.types';

@Controller('auth/registrations')
@Public()
@UseFilters(RegistrationExceptionFilter)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    validationError: { target: false, value: false },
  }),
)
export class RegistrationController {
  constructor(
    private readonly registrations: RegistrationService,
    private readonly limits: RegistrationLimits,
  ) {}

  @Post()
  @Header('Cache-Control', 'no-store')
  async start(@Body() input: StartRegistrationDto, @Req() request: Request) {
    const ip = request.ip ?? request.socket.remoteAddress ?? 'unknown';
    await this.limits.request(ip);
    return this.registrations.start(input, ip);
  }

  @Post('resend')
  @Header('Cache-Control', 'no-store')
  @HttpCode(200)
  async resend(@Body() input: RegistrationIdDto, @Req() request: Request) {
    const ip = request.ip ?? request.socket.remoteAddress ?? 'unknown';
    await this.limits.request(ip);
    return this.registrations.resend(input.registrationId, ip);
  }

  @Post('verify')
  @Header('Cache-Control', 'no-store')
  @HttpCode(200)
  async verify(@Body() input: VerifyRegistrationDto, @Req() request: Request) {
    await this.limits.request(
      request.ip ?? request.socket.remoteAddress ?? 'unknown',
    );
    return this.registrations.verify(
      input.registrationId,
      input.code,
      clientPlatform(request.headers['x-client-platform']),
    );
  }
}

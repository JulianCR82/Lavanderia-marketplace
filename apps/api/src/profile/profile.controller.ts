import {
  ArgumentsHost,
  Body,
  Catch,
  Controller,
  ExceptionFilter,
  Header,
  HttpException,
  Patch,
  UseFilters,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentSession } from '../sessions/session.guard';
import type { AccountProfile, SessionContext } from '../sessions/session.types';
import { UpdateProfileDto } from './profile.dto';
import { ProfileService } from './profile.service';

@Catch()
class ProfileExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    response.setHeader('Cache-Control', 'no-store');
    if (error instanceof HttpException) {
      response.status(error.getStatus()).json(error.getResponse());
      return;
    }
    response.status(503).json({
      code: 'PROFILE_UNAVAILABLE',
      message: 'No pudimos guardar tu perfil. Intenta de nuevo.',
    });
  }
}

/** US-001.04: the authenticated account is the only writable resource. */
@Controller('profile')
@UseFilters(ProfileExceptionFilter)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class ProfileController {
  constructor(private readonly profiles: ProfileService) {}

  @Patch('me')
  @Header('Cache-Control', 'no-store')
  async update(
    @CurrentSession() session: SessionContext,
    @Body() input: UpdateProfileDto,
  ): Promise<AccountProfile> {
    const displayName = await this.profiles.update(
      session.profile.id,
      input.displayName,
    );
    return { ...session.profile, displayName };
  }
}

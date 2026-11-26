import {
  ArgumentsHost,
  Catch,
  Controller,
  Delete,
  ExceptionFilter,
  Get,
  Header,
  HttpCode,
  HttpException,
  Param,
  ParseUUIDPipe,
  Query,
  UseFilters,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentSession } from './session.guard';
import type { SessionContext } from './session.types';
import { SessionService } from './session.service';
import { ListSessionsDto } from './session.dto';

@Catch()
class SessionExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    response.setHeader('Cache-Control', 'no-store');
    if (error instanceof HttpException) {
      response.status(error.getStatus()).json(error.getResponse());
      return;
    }
    response.status(503).json({
      code: 'SESSIONS_UNAVAILABLE',
      message: 'No pudimos gestionar tus sesiones. Intenta de nuevo.',
    });
  }
}

@Controller('auth/sessions')
@UseFilters(SessionExceptionFilter)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    validationError: { target: false, value: false },
  }),
)
export class SessionController {
  constructor(private readonly sessions: SessionService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  list(
    @CurrentSession() context: SessionContext,
    @Query() input: ListSessionsDto,
  ) {
    return this.sessions.list(context, input.cursor);
  }

  @Delete(':id')
  @HttpCode(204)
  @Header('Cache-Control', 'no-store')
  revoke(
    @CurrentSession() context: SessionContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.sessions.revoke(context, id);
  }
}

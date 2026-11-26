import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Injectable,
} from '@nestjs/common';
import type { Response } from 'express';

/** Prevent persistence/provider errors and their details from reaching logs or clients. */
@Injectable()
@Catch()
export class RegistrationExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    response.setHeader('Cache-Control', 'no-store');
    if (error instanceof HttpException) {
      response.status(error.getStatus()).json(error.getResponse());
      return;
    }
    response.status(503).json({
      code: 'REGISTRATION_UNAVAILABLE',
      message: 'No pudimos completar el registro. Intenta más tarde.',
    });
  }
}

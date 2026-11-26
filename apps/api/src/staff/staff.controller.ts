import {
  ArgumentsHost,
  Body,
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
  Post,
  Query,
  Req,
  UseFilters,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthorizationGuard } from '../auth/authorization.guard';
import { RequireLaundryRole } from '../auth/authorization.decorator';
import { CurrentSession } from '../sessions/session.guard';
import type { SessionContext } from '../sessions/session.types';
import { clientPlatform } from '../sessions/session.types';
import { AcceptStaffDto, InviteStaffDto, StaffPageDto } from './staff.dto';
import { StaffService } from './staff.service';

@Catch()
class StaffExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    res.setHeader('Cache-Control', 'no-store');
    if (error instanceof HttpException) {
      res.status(error.getStatus()).json(error.getResponse());
      return;
    }
    res.status(503).json({
      code: 'STAFF_UNAVAILABLE',
      message: 'No pudimos completar la solicitud. Intenta de nuevo.',
    });
  }
}
@Controller()
@UseFilters(StaffExceptionFilter)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    validationError: { target: false, value: false },
  }),
)
export class StaffController {
  constructor(private readonly staff: StaffService) {}
  @Get('staff/invitations')
  @Header('Cache-Control', 'no-store')
  list(
    @CurrentSession() session: SessionContext,
    @Query() query: StaffPageDto,
  ) {
    return this.staff.list(session, undefined, query.cursor);
  }

  @Post('staff/invitations/:id/accept')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  accept(
    @CurrentSession() session: SessionContext,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() input: AcceptStaffDto,
    @Req() req: Request,
  ) {
    // Acceptance accepts no role/account/laundry fields; the server chooses all three.
    if (input.confirm !== true)
      throw new HttpException(
        'Debes confirmar la conversión de tu cuenta.',
        400,
      );
    return this.staff.accept(
      session,
      id,
      clientPlatform(req.headers['x-client-platform']),
    );
  }

  @Get('laundries/:laundryId/staff-invitations')
  @UseGuards(AuthorizationGuard)
  @RequireLaundryRole('OWNER')
  @Header('Cache-Control', 'no-store')
  team(
    @CurrentSession() session: SessionContext,
    @Param('laundryId', new ParseUUIDPipe({ version: '4' })) laundryId: string,
    @Query() query: StaffPageDto,
  ) {
    return this.staff.list(session, laundryId, query.cursor);
  }

  @Post('laundries/:laundryId/staff-invitations')
  @UseGuards(AuthorizationGuard)
  @RequireLaundryRole('OWNER')
  @Header('Cache-Control', 'no-store')
  invite(
    @CurrentSession() session: SessionContext,
    @Param('laundryId', new ParseUUIDPipe({ version: '4' })) laundryId: string,
    @Body() input: InviteStaffDto,
    @Req() req: Request,
  ) {
    return this.staff.invite(
      session,
      laundryId,
      input.email,
      req.ip ?? req.socket.remoteAddress ?? 'unknown',
    );
  }

  @Delete('laundries/:laundryId/staff-invitations/:id')
  @UseGuards(AuthorizationGuard)
  @RequireLaundryRole('OWNER')
  @HttpCode(204)
  @Header('Cache-Control', 'no-store')
  cancel(
    @CurrentSession() session: SessionContext,
    @Param('laundryId', new ParseUUIDPipe({ version: '4' })) laundryId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.staff.cancel(session, laundryId, id);
  }
}

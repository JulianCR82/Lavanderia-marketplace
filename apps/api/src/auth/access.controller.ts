import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { CurrentSession } from '../sessions/session.guard';
import type { SessionContext } from '../sessions/session.types';
import { AuthorizationGuard } from './authorization.guard';
import {
  RequireLaundryRole,
  RequirePlatformRole,
  RequireCustomerAccount,
} from './authorization.decorator';

/** Minimal access contracts. Business capabilities remain in their own future modules. */
@Controller()
@UseGuards(AuthorizationGuard)
export class AccessController {
  @RequireCustomerAccount()
  @Get('customer/access')
  customer() {
    return { accountKind: 'CUSTOMER' };
  }

  @RequirePlatformRole()
  @Get('platform/access')
  platform(@CurrentSession() session: SessionContext) {
    return { platformRole: session.profile.platformRole };
  }

  @RequireLaundryRole('OWNER', 'STAFF')
  @Get('laundries/:laundryId/access')
  laundry(
    @Param('laundryId', new ParseUUIDPipe({ version: '4' })) laundryId: string,
    @CurrentSession() session: SessionContext,
  ) {
    return session.profile.memberships.find(
      (item) => item.laundryId === laundryId,
    );
  }
}

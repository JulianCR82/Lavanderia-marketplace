import { Injectable } from '@nestjs/common';
import { sendTransactionalEmail } from '../mail/resend-transport';

export abstract class StaffMailer {
  abstract send(
    email: string,
    laundryName: string,
    deliveryId: string,
  ): Promise<void>;
}
@Injectable()
export class ResendStaffMailer extends StaffMailer {
  async send(email: string, laundryName: string, deliveryId: string) {
    await sendTransactionalEmail(
      email,
      'Invitación de trabajo — Lavandería',
      `Te invitaron como Staff a ${laundryName}. Abre la app, ingresa con este correo y entra en Perfil > Invitaciones de trabajo. Si aún no tienes cuenta, regístrate y verifica este mismo correo. La invitación vence 48 horas después de su creación. Al aceptarla, tu cuenta dejará de tener funciones de cliente y pasará a ser una cuenta de trabajo. Si no deseas incorporarte, no la aceptes.`,
      deliveryId,
    );
  }
}

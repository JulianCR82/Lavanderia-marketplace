import { Injectable } from '@nestjs/common';
import { sendTransactionalEmail } from '../mail/resend-transport';

export abstract class RegistrationMailer {
  abstract send(email: string, code: string, deliveryId: string): Promise<void>;
}

@Injectable()
export class ResendRegistrationMailer extends RegistrationMailer {
  async send(email: string, code: string, deliveryId: string): Promise<void> {
    await sendTransactionalEmail(
      email,
      'Verifica tu correo — Lavandería',
      `Tu código de registro es ${code}. Vence en 10 minutos. Si no lo solicitaste, ignora este mensaje.`,
      deliveryId,
    );
  }
}

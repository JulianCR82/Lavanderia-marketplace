import { Injectable } from '@nestjs/common';
import { sendTransactionalEmail } from '../mail/resend-transport';

export abstract class RecoveryMailer {
  abstract sendCode(email: string, code: string, id: string): Promise<void>;
  abstract sendChanged(email: string, id: string): Promise<void>;
}
@Injectable()
export class ResendRecoveryMailer extends RecoveryMailer {
  sendCode(email: string, code: string, id: string): Promise<void> {
    return sendTransactionalEmail(
      email,
      'Recupera tu acceso — Lavandería',
      `Tu código de recuperación es ${code}. El proceso vence en 10 minutos desde la primera solicitud. Si no lo solicitaste, ignora este mensaje. Nunca compartas este código.`,
      id,
    );
  }
  sendChanged(email: string, id: string): Promise<void> {
    return sendTransactionalEmail(
      email,
      'Tu contraseña cambió — Lavandería',
      'Se restableció la contraseña de tu cuenta y se cerraron sus sesiones. Si no fuiste tú, protege tu correo y recupera el acceso desde la app. Nunca te pediremos tu contraseña por correo.',
      id,
    );
  }
}

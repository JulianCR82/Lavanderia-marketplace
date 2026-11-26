import { ServiceUnavailableException } from '@nestjs/common';

/** Server-only transport: provider bodies/addresses/secrets never reach logs. */
export async function sendTransactionalEmail(
  email: string,
  subject: string,
  text: string,
  deliveryId: string,
): Promise<void> {
  const key = process.env.RESEND_API_KEY,
    from = process.env.REGISTRATION_FROM_EMAIL;
  const unavailable = () =>
    new ServiceUnavailableException({
      code: 'EMAIL_UNAVAILABLE',
      message: 'No pudimos enviar el correo. Intenta de nuevo en un minuto.',
    });
  if (!key || !from) throw unavailable();
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      signal: AbortSignal.timeout(10_000),
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': deliveryId,
      },
      body: JSON.stringify({ from, to: [email], subject, text }),
    });
    if (!response.ok) throw unavailable();
  } catch {
    throw unavailable();
  }
}

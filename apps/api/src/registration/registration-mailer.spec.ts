import { ResendRegistrationMailer } from './registration-mailer';
import { jest } from '@jest/globals';

describe('ResendRegistrationMailer', () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.RESEND_API_KEY;
  const originalFrom = process.env.REGISTRATION_FROM_EMAIL;
  beforeEach(() => {
    process.env.RESEND_API_KEY = 'test-only-key';
    process.env.REGISTRATION_FROM_EMAIL = 'Registro <registro@example.com>';
  });
  afterEach(() => {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
    if (originalFrom === undefined) delete process.env.REGISTRATION_FROM_EMAIL;
    else process.env.REGISTRATION_FROM_EMAIL = originalFrom;
  });

  it('sends through the Resend contract with an idempotency key', async () => {
    const fetchMock = jest
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('{}', { status: 200 }));
    global.fetch = fetchMock;
    await new ResendRegistrationMailer().send(
      'cliente@example.com',
      '012345',
      'delivery-1',
    );
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect(options?.headers).toEqual({
      Authorization: 'Bearer test-only-key',
      'Content-Type': 'application/json',
      'Idempotency-Key': 'delivery-1',
    });
    expect(JSON.parse(options?.body as string) as unknown).toEqual({
      from: 'Registro <registro@example.com>',
      to: ['cliente@example.com'],
      subject: expect.any(String) as unknown,
      text: expect.stringContaining('012345') as unknown,
    });
  });

  it('returns sanitized errors on provider failure and does not call it without configuration', async () => {
    global.fetch = jest
      .fn<typeof fetch>()
      .mockRejectedValue(new Error('provider secret'));
    await expect(
      new ResendRegistrationMailer().send(
        'a@example.com',
        '012345',
        'delivery-1',
      ),
    ).rejects.toThrow('No pudimos enviar el correo.');
    delete process.env.RESEND_API_KEY;
    const fetchMock = jest.fn<typeof fetch>();
    global.fetch = fetchMock;
    await expect(
      new ResendRegistrationMailer().send(
        'a@example.com',
        '012345',
        'delivery-2',
      ),
    ).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

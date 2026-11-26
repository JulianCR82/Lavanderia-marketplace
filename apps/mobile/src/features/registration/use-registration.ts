import { useEffect, useRef, useState } from "react";
import {
  PendingRegistration,
  RegistrationError,
  registrationApi,
} from "./registration-api";
import { useAuth } from "../auth/auth-context";

export function useRegistration() {
  const auth = useAuth();
  const [pending, setPending] = useState<PendingRegistration | null>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [retryAt, setRetryAt] = useState(0);
  const inFlight = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  async function run(action: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No pudimos completar la solicitud.",
      );
      if (cause instanceof RegistrationError && cause.retryAfterSeconds)
        setRetryAt(Date.now() + cause.retryAfterSeconds * 1000);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  const cooldown = Math.max(
    0,
    Math.ceil(
      (Math.max(pending ? Date.parse(pending.resendAvailableAt) : 0, retryAt) -
        now) /
        1000,
    ),
  );
  return {
    pending,
    busy,
    created,
    error,
    cooldown,
    expired: pending ? now >= Date.parse(pending.expiresAt) : false,
    start: (email: string, password: string) =>
      run(async () => setPending(await registrationApi.start(email, password))),
    resend: () =>
      run(async () => {
        if (pending)
          setPending(await registrationApi.resend(pending.registrationId));
      }),
    verify: (code: string) =>
      run(async () => {
        if (pending) {
          const grant = await registrationApi.verify(
            pending.registrationId,
            code,
          );
          setPending(null);
          setCreated(true);
          await auth.complete(grant);
        }
      }),
    reset: () => {
      if (!inFlight.current) {
        setPending(null);
        setError("");
      }
    },
  };
}

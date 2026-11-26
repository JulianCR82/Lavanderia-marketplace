import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import {
  recoveryApi,
  type PendingRecovery,
  type RecoveryGrant,
} from "./recovery-api";

type RecoveryState =
  | { step: "email" }
  | { step: "code"; pending: PendingRecovery }
  | { step: "password"; grant: RecoveryGrant }
  | { step: "done" };

/** Proofs live only in this screen's memory, never URLs, storage or analytics. */
export function useRecovery() {
  const [state, setState] = useState<RecoveryState>({ step: "email" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retryAt, setRetryAt] = useState(0);
  const [now, setNow] = useState(Date.now);
  const locked = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (state.step === "done") return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [state.step]);

  async function run(action: () => Promise<RecoveryState>) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      const next = await action();
      if (mounted.current) {
        setState(next);
        setNow(Date.now());
      }
    } catch (cause) {
      if (mounted.current) {
        setError(
          cause instanceof Error
            ? cause.message
            : "No pudimos completar la recuperación.",
        );
        if (cause instanceof ApiError && cause.retryAfterSeconds)
          setRetryAt(Date.now() + cause.retryAfterSeconds * 1000);
      }
    } finally {
      locked.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  const expiresAt =
    state.step === "code"
      ? state.pending.expiresAt
      : state.step === "password"
        ? state.grant.expiresAt
        : null;
  const cooldown = Math.max(
    0,
    Math.ceil(
      (Math.max(
        retryAt,
        state.step === "code" ? Date.parse(state.pending.resendAvailableAt) : 0,
      ) -
        now) /
        1000,
    ),
  );
  return {
    state,
    busy,
    error,
    cooldown,
    expired: !!expiresAt && now >= Date.parse(expiresAt),
    request: (email: string) =>
      run(async () => ({
        step: "code",
        pending: await recoveryApi.request(email),
      })),
    resend: () =>
      run(async () =>
        state.step === "code"
          ? {
              step: "code",
              pending: await recoveryApi.resend(state.pending.recoveryId),
            }
          : state,
      ),
    verify: (code: string) =>
      run(async () =>
        state.step === "code"
          ? {
              step: "password",
              grant: await recoveryApi.verify(state.pending.recoveryId, code),
            }
          : state,
      ),
    reset: (password: string, confirmation: string) =>
      run(async () => {
        if (state.step !== "password") return state;
        await recoveryApi.reset(state.grant.resetToken, password, confirmation);
        return { step: "done" };
      }),
    restart: () => {
      if (!locked.current) {
        setState({ step: "email" });
        setError("");
      }
    },
  };
}

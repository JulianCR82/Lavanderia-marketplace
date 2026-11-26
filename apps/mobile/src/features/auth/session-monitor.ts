/** Check only while visible; resume immediately, never overlap requests or sign out on network failure. */
export const SESSION_CHECK_INTERVAL_MS = 5_000;

type Schedule = (callback: () => void, delay: number) => () => void;

const scheduleTimeout: Schedule = (callback, delay) => {
  const timer = setTimeout(callback, delay);
  return () => clearTimeout(timer);
};

export function createSessionMonitor(
  check: () => Promise<void>,
  schedule: Schedule = scheduleTimeout,
) {
  let active = false;
  let stopped = false;
  let checking = false;
  let cancelTimer: (() => void) | null = null;

  function pause() {
    active = false;
    cancelTimer?.();
    cancelTimer = null;
  }

  async function tick() {
    if (!active || stopped || checking) return;
    checking = true;
    try {
      await check();
    } catch {
      // AuthProvider handles definitive invalidation. Temporary connectivity failures are retryable.
    } finally {
      checking = false;
      if (active && !stopped)
        cancelTimer = schedule(() => {
          cancelTimer = null;
          void tick();
        }, SESSION_CHECK_INTERVAL_MS);
    }
  }

  return {
    resume() {
      if (stopped || active) return;
      active = true;
      void tick();
    },
    pause,
    stop() {
      stopped = true;
      pause();
    },
  };
}

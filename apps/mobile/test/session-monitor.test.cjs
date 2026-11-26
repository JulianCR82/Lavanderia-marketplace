const { test } = require("node:test");
const assert = require("node:assert/strict");

const monitorModule = import("../src/features/auth/session-monitor.ts");
const flush = () => new Promise((resolve) => setImmediate(resolve));

function fakeClock() {
  const tasks = new Set();
  return {
    tasks,
    schedule(callback, delay) {
      const task = { callback, delay };
      tasks.add(task);
      return () => tasks.delete(task);
    },
    fire() {
      const task = tasks.values().next().value;
      assert.ok(task, "A check must be scheduled");
      tasks.delete(task);
      task.callback();
    },
  };
}

test("checks immediately when active and repeats every five seconds without user requests", async () => {
  const { createSessionMonitor, SESSION_CHECK_INTERVAL_MS } =
    await monitorModule;
  const clock = fakeClock();
  let checks = 0;
  const monitor = createSessionMonitor(async () => {
    checks++;
  }, clock.schedule);
  assert.equal(checks, 0);
  monitor.resume();
  await flush();
  assert.equal(checks, 1);
  assert.equal([...clock.tasks][0].delay, SESSION_CHECK_INTERVAL_MS);
  assert.equal(SESSION_CHECK_INTERVAL_MS, 5000);
  clock.fire();
  await flush();
  assert.equal(checks, 2);
  assert.equal(clock.tasks.size, 1);
  monitor.stop();
});

test("never overlaps checks, including a foreground change during a slow request", async () => {
  const { createSessionMonitor } = await monitorModule;
  const clock = fakeClock();
  let checks = 0,
    resolveCheck;
  const pending = new Promise((resolve) => {
    resolveCheck = resolve;
  });
  const monitor = createSessionMonitor(async () => {
    checks++;
    await pending;
  }, clock.schedule);
  monitor.resume();
  monitor.resume();
  monitor.pause();
  monitor.resume();
  assert.equal(checks, 1);
  assert.equal(clock.tasks.size, 0);
  resolveCheck();
  await flush();
  assert.equal(clock.tasks.size, 1);
  monitor.stop();
});

test("pauses while hidden and revalidates immediately on returning to foreground", async () => {
  const { createSessionMonitor } = await monitorModule;
  const clock = fakeClock();
  let checks = 0;
  const monitor = createSessionMonitor(async () => {
    checks++;
  }, clock.schedule);
  monitor.resume();
  await flush();
  monitor.pause();
  assert.equal(clock.tasks.size, 0);
  assert.equal(checks, 1);
  monitor.resume();
  await flush();
  assert.equal(checks, 2);
  monitor.stop();
});

test("retains retryability after connectivity failures", async () => {
  const { createSessionMonitor } = await monitorModule;
  const clock = fakeClock();
  let checks = 0;
  const monitor = createSessionMonitor(async () => {
    checks++;
    throw new Error("network unavailable");
  }, clock.schedule);
  monitor.resume();
  await flush();
  assert.equal(clock.tasks.size, 1);
  clock.fire();
  await flush();
  assert.equal(checks, 2);
  monitor.stop();
});

test("stops after definitive revocation instead of scheduling another check", async () => {
  const { createSessionMonitor } = await monitorModule;
  const clock = fakeClock();
  let monitor;
  monitor = createSessionMonitor(async () => {
    monitor.stop();
    throw new Error("SESSION_INVALID");
  }, clock.schedule);
  monitor.resume();
  await flush();
  assert.equal(clock.tasks.size, 0);
  monitor.resume();
  await flush();
  assert.equal(clock.tasks.size, 0);
});

test("cleanup prevents a request still in flight from rearming the timer", async () => {
  const { createSessionMonitor } = await monitorModule;
  const clock = fakeClock();
  let resolveCheck;
  const pending = new Promise((resolve) => {
    resolveCheck = resolve;
  });
  const monitor = createSessionMonitor(() => pending, clock.schedule);
  monitor.resume();
  monitor.stop();
  resolveCheck();
  await flush();
  assert.equal(clock.tasks.size, 0);
  monitor.resume();
  assert.equal(clock.tasks.size, 0);
});

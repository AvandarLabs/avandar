import { promiseMapSequential } from "@avandar/utils";
import {
  createWriteThrottle,
  FIRST_RETRY_DELAY_MS,
  INITIAL_WRITE_BYTE_BUDGET,
  MAX_RETRY_DELAY_MS,
  MAX_SLOW_WRITE_PAUSE_MS,
  MAX_TRANSIENT_FAILURES,
  MAX_WRITE_BYTE_BUDGET,
  MIN_WRITE_BYTE_BUDGET,
  WRITE_BUDGET_STEP_BYTES,
} from "@etl/EtlEngine/writeThrottle/createWriteThrottle";
import { EtlTransientStoreError } from "@etl/stores/EtlTransientStoreError";
import { describe, expect, it } from "vitest";
import type { EtlClock } from "@etl/EtlEngine/EtlEngine.types";
import type { EtlWriteThrottleEvent } from "@etl/EtlEngine/writeThrottle/createWriteThrottle";

/**
 * A clock whose time moves only when a write takes time or the throttle
 * sleeps, so no test waits on a real timer.
 */
function _fakeTime() {
  let nowMs = 0;
  const sleeps: number[] = [];
  const clock: EtlClock = {
    now: () => {
      return new Date(nowMs);
    },
    monotonicMs: () => {
      return nowMs;
    },
    sleep: async (ms) => {
      sleeps.push(ms);
      nowMs += ms;
    },
  };
  const takeMs = (ms: number) => {
    return async (): Promise<string> => {
      nowMs += ms;
      return "written";
    };
  };
  return { clock, sleeps, takeMs };
}

function _throttle(
  random: () => number = () => {
    return 0.5;
  },
) {
  const time = _fakeTime();
  const events: EtlWriteThrottleEvent[] = [];
  const throttle = createWriteThrottle({
    clock: time.clock,
    random,
    onEvent: (event) => {
      events.push(event);
    },
  });
  return { throttle, events, ...time };
}

function _transientError(
  message = "statement timeout",
): EtlTransientStoreError {
  return new EtlTransientStoreError(message, {
    status: 500,
    code: "57014",
    cause: undefined,
  });
}

/**
 * Runs `work` `count` times, one after another, since each call changes the
 * throttle's state for the next, and returns what each call returned.
 */
async function _repeat<T>(
  count: number,
  work: () => Promise<T>,
): Promise<readonly T[]> {
  return await promiseMapSequential(Array.from({ length: count }), () => {
    return work();
  });
}

async function _catch(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error: unknown) {
    return error;
  }
  return undefined;
}

describe("createWriteThrottle", () => {
  describe("byte budget", () => {
    it("starts at the initial budget", () => {
      expect(_throttle().throttle.getByteBudget()).toBe(
        INITIAL_WRITE_BYTE_BUDGET,
      );
    });

    it("grows after each fast write, up to the most a write may carry, without pausing", async () => {
      const { throttle, takeMs, sleeps } = _throttle();
      const budgets = await _repeat(6, async () => {
        await throttle.timeWrite(takeMs(200));
        return throttle.getByteBudget();
      });

      expect([budgets, sleeps]).toEqual([
        [
          INITIAL_WRITE_BYTE_BUDGET + WRITE_BUDGET_STEP_BYTES,
          INITIAL_WRITE_BYTE_BUDGET + 2 * WRITE_BUDGET_STEP_BYTES,
          INITIAL_WRITE_BYTE_BUDGET + 3 * WRITE_BUDGET_STEP_BYTES,
          MAX_WRITE_BYTE_BUDGET,
          MAX_WRITE_BYTE_BUDGET,
          MAX_WRITE_BYTE_BUDGET,
        ],
        [],
      ]);
    });

    it("keeps the budget, without pausing, after a write that is neither fast nor slow", async () => {
      const { throttle, takeMs, sleeps, events } = _throttle();

      await throttle.timeWrite(takeMs(1500));

      expect([throttle.getByteBudget(), sleeps, events]).toEqual([
        INITIAL_WRITE_BYTE_BUDGET,
        [],
        [],
      ]);
    });

    it("halves after a slow write and pauses as long as it took", async () => {
      const { throttle, takeMs, sleeps, events } = _throttle();

      const result = await throttle.timeWrite(takeMs(5000));

      expect([result, throttle.getByteBudget(), sleeps, events]).toEqual([
        "written",
        INITIAL_WRITE_BYTE_BUDGET / 2,
        [5000],
        [
          {
            reason: "slow_write",
            writeMs: 5000,
            byteBudget: INITIAL_WRITE_BYTE_BUDGET / 2,
            pauseMs: 5000,
          },
        ],
      ]);
    });

    it("caps a slow write's pause, and never shrinks the budget below the least", async () => {
      const { throttle, takeMs, sleeps } = _throttle();
      await _repeat(10, () => {
        return throttle.timeWrite(takeMs(MAX_SLOW_WRITE_PAUSE_MS * 2));
      });

      expect([throttle.getByteBudget(), Math.max(...sleeps)]).toEqual([
        MIN_WRITE_BYTE_BUDGET,
        MAX_SLOW_WRITE_PAUSE_MS,
      ]);
    });
  });

  describe("transient failures", () => {
    it("rethrows a failure that is not transient at once, without waiting", async () => {
      const { throttle, sleeps } = _throttle();
      const notTransient = new Error("duplicate key");

      const thrown = await _catch(throttle.waitAfterFailure(notTransient));

      expect([thrown, sleeps, throttle.getByteBudget()]).toEqual([
        notTransient,
        [],
        INITIAL_WRITE_BYTE_BUDGET,
      ]);
    });

    it("quarters the budget and waits twice as long after each failure in a row, up to the longest wait", async () => {
      const { throttle, sleeps, events } = _throttle();
      await _repeat(MAX_TRANSIENT_FAILURES - 1, () => {
        return throttle.waitAfterFailure(_transientError());
      });

      expect(sleeps).toEqual([
        FIRST_RETRY_DELAY_MS,
        FIRST_RETRY_DELAY_MS * 2,
        FIRST_RETRY_DELAY_MS * 4,
        FIRST_RETRY_DELAY_MS * 8,
        FIRST_RETRY_DELAY_MS * 16,
        MAX_RETRY_DELAY_MS,
        MAX_RETRY_DELAY_MS,
      ]);
      expect([throttle.getByteBudget(), events[0]]).toEqual([
        MIN_WRITE_BYTE_BUDGET,
        {
          reason: "transient_failure",
          failureCount: 1,
          maxFailures: MAX_TRANSIENT_FAILURES,
          message: "statement timeout",
          byteBudget: INITIAL_WRITE_BYTE_BUDGET / 4,
          pauseMs: FIRST_RETRY_DELAY_MS,
        },
      ]);
    });

    it("spreads each wait by up to a quarter either way", async () => {
      const waits = await Promise.all(
        [0, 1].map(async (randomValue) => {
          const { throttle, sleeps } = _throttle(() => {
            return randomValue;
          });
          await throttle.waitAfterFailure(_transientError());
          return sleeps[0];
        }),
      );

      expect(waits).toEqual([
        FIRST_RETRY_DELAY_MS * 0.75,
        FIRST_RETRY_DELAY_MS * 1.25,
      ]);
    });

    it("gives up on the last allowed failure in a row, naming how many there were", async () => {
      const { throttle, sleeps } = _throttle();
      await _repeat(MAX_TRANSIENT_FAILURES - 1, () => {
        return throttle.waitAfterFailure(_transientError());
      });
      const lastFailure = _transientError("still timing out");

      const thrown = await _catch(throttle.waitAfterFailure(lastFailure));

      expect([
        (thrown as Error).message,
        (thrown as Error).cause,
        sleeps.length,
      ]).toEqual([
        `Gave up after ${String(MAX_TRANSIENT_FAILURES)} transient failures in a row: still timing out`,
        lastFailure,
        MAX_TRANSIENT_FAILURES - 1,
      ]);
    });

    it("starts counting again after a request succeeds", async () => {
      const { throttle, takeMs, sleeps } = _throttle();
      await _repeat(MAX_TRANSIENT_FAILURES - 1, () => {
        return throttle.waitAfterFailure(_transientError());
      });
      await throttle.timeWrite(takeMs(10));
      await throttle.waitAfterFailure(_transientError());

      expect(sleeps.at(-1)).toBe(FIRST_RETRY_DELAY_MS);
    });
  });

  describe("retryTransient", () => {
    it("retries a request after each transient failure until it succeeds", async () => {
      const { throttle, sleeps } = _throttle();
      let attempts = 0;

      const result = await throttle.retryTransient(async () => {
        attempts += 1;
        if (attempts < 3) {
          throw _transientError();
        }
        return "read";
      });

      expect([result, attempts, sleeps]).toEqual([
        "read",
        3,
        [FIRST_RETRY_DELAY_MS, FIRST_RETRY_DELAY_MS * 2],
      ]);
    });

    it("does not retry a failure that is not transient", async () => {
      const { throttle } = _throttle();
      let attempts = 0;
      const notTransient = new Error("permission denied");

      const thrown = await _catch(
        throttle.retryTransient(async () => {
          attempts += 1;
          throw notTransient;
        }),
      );

      expect([thrown, attempts]).toEqual([notTransient, 1]);
    });
  });
});

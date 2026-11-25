import { setTimeout } from "node:timers/promises";
import { isEtlTransientStoreError } from "@etl/stores/EtlTransientStoreError";
import type { EtlClock } from "@etl/EtlEngine/EtlEngine.types";

const KIB = 1024;
const MIB = 1024 * KIB;

/** The byte budget a crawl's first write starts from. */
export const INITIAL_WRITE_BYTE_BUDGET = 2 * MIB;

/**
 * The most JSON bytes one write may carry, however fast writes are. On the
 * demo instance a 22 MB write timed out and a 100 MB one ran the database
 * out of memory.
 */
export const MAX_WRITE_BYTE_BUDGET = 4 * MIB;

/**
 * The least byte budget. A listing larger than the budget is still written,
 * alone, so the budget never stops a page from loading.
 */
export const MIN_WRITE_BYTE_BUDGET = 64 * KIB;

/** How much a fast write grows the budget by. */
export const WRITE_BUDGET_STEP_BYTES = 512 * KIB;

/** A write faster than this grows the budget. */
export const FAST_WRITE_MS = 1000;

/**
 * A write slower than this halves the budget and pauses the crawl: a quarter
 * of the hosted database's 8 s statement timeout, so a slowing database is
 * eased off well before a write times out.
 */
export const SLOW_WRITE_MS = 2000;

/** The longest pause after a slow write. */
export const MAX_SLOW_WRITE_PAUSE_MS = 30_000;

/** The wait after a first transient failure, doubled for each one after. */
export const FIRST_RETRY_DELAY_MS = 2000;

/** The longest wait after a transient failure. */
export const MAX_RETRY_DELAY_MS = 60_000;

/**
 * How many transient failures in a row the throttle waits out. The next one
 * fails the request, after about 3 minutes of waiting in all.
 */
export const MAX_TRANSIENT_FAILURES = 8;

/** How far either way a retry's wait is spread, so retries do not align. */
const RETRY_JITTER_FRACTION = 0.25;

/** Something the throttle did to ease off the database. */
export type EtlWriteThrottleEvent = Readonly<
  | {
      reason: "slow_write";
      /** How long the slow write took. */
      writeMs: number;
      /** The byte budget the next write starts from. */
      byteBudget: number;
      /** How long the crawl pauses before its next request. */
      pauseMs: number;
    }
  | {
      reason: "transient_failure";
      /** Which failure in a row this is, from 1. */
      failureCount: number;
      /** How many failures in a row fail the request. */
      maxFailures: number;
      /** The failure's message. */
      message: string;
      byteBudget: number;
      pauseMs: number;
    }
>;

/** Paces one crawl's store requests to how the database is keeping up. */
export type WriteThrottle = Readonly<{
  /** The most JSON bytes the next write may carry. */
  getByteBudget: () => number;
  /**
   * Runs one write and adapts the budget to how long it took: grows it after
   * a fast write, and halves it and pauses after a slow one. A write that
   * throws changes nothing here: pass its error to `waitAfterFailure`.
   */
  timeWrite: <T>(write: () => Promise<T>) => Promise<T>;
  /**
   * Waits out a transient failure, so the caller can retry: quarters the
   * budget and waits longer for each failure in a row. Rethrows an error
   * that is not an `EtlTransientStoreError` at once, and throws, with the
   * last failure as its cause, once `MAX_TRANSIENT_FAILURES` come in a row.
   */
  waitAfterFailure: (error: unknown) => Promise<void>;
  /** Runs a request, retrying it after each transient failure. */
  retryTransient: <T>(request: () => Promise<T>) => Promise<T>;
}>;

function _clampBudget(byteBudget: number): number {
  return Math.min(
    MAX_WRITE_BYTE_BUDGET,
    Math.max(MIN_WRITE_BYTE_BUDGET, Math.floor(byteBudget)),
  );
}

function _getRetryDelayMs(failureCount: number, random: () => number): number {
  const baseDelayMs = Math.min(
    MAX_RETRY_DELAY_MS,
    FIRST_RETRY_DELAY_MS * 2 ** (failureCount - 1),
  );
  const spread =
    1 - RETRY_JITTER_FRACTION + 2 * RETRY_JITTER_FRACTION * random();
  return Math.round(baseDelayMs * spread);
}

/**
 * The byte budget after a write that took `writeMs`, and the slow-write
 * event when it was slow.
 */
function _adaptToWrite(
  byteBudget: number,
  writeMs: number,
): Readonly<{ byteBudget: number; event: EtlWriteThrottleEvent | undefined }> {
  if (writeMs < FAST_WRITE_MS) {
    return {
      byteBudget: _clampBudget(byteBudget + WRITE_BUDGET_STEP_BYTES),
      event: undefined,
    };
  }
  if (writeMs <= SLOW_WRITE_MS) {
    return { byteBudget, event: undefined };
  }
  const slowerBudget = _clampBudget(byteBudget / 2);
  return {
    byteBudget: slowerBudget,
    event: {
      reason: "slow_write",
      writeMs,
      byteBudget: slowerBudget,
      pauseMs: Math.min(writeMs, MAX_SLOW_WRITE_PAUSE_MS),
    },
  };
}

/**
 * The transient-failure event for the `failureCount`th failure in a row,
 * with the quartered budget and its wait.
 *
 * @throws When the failure is not transient, rethrowing it, and once it is
 *   the `MAX_TRANSIENT_FAILURES`th in a row, with it as the cause.
 */
function _buildFailureEvent(args: {
  error: unknown;
  failureCount: number;
  byteBudget: number;
  random: () => number;
}): EtlWriteThrottleEvent {
  const { error, failureCount } = args;
  if (!isEtlTransientStoreError(error)) {
    throw error;
  }
  if (failureCount >= MAX_TRANSIENT_FAILURES) {
    throw new Error(
      `Gave up after ${String(failureCount)} transient failures in a row: ${error.message}`,
      { cause: error },
    );
  }
  return {
    reason: "transient_failure",
    failureCount,
    maxFailures: MAX_TRANSIENT_FAILURES,
    message: error.message,
    byteBudget: _clampBudget(args.byteBudget / 4),
    pauseMs: _getRetryDelayMs(failureCount, args.random),
  };
}

/**
 * Runs a request, and after each failure lets `waitAfterFailure` wait it out
 * or rethrow, then runs it again. Calls `onSuccess` once it succeeds.
 */
async function _retryTransient<T>(args: {
  request: () => Promise<T>;
  waitAfterFailure: (error: unknown) => Promise<void>;
  onSuccess: () => void;
}): Promise<T> {
  try {
    const result = await args.request();
    args.onSuccess();
    return result;
  } catch (error: unknown) {
    await args.waitAfterFailure(error);
    return await _retryTransient(args);
  }
}

/** Runs a write, and returns what it returned and how long it took. */
async function _timeWrite<T>(
  clock: EtlClock,
  write: () => Promise<T>,
): Promise<Readonly<{ result: T; writeMs: number }>> {
  const startedMs = clock.monotonicMs();
  const result = await write();
  return { result, writeMs: clock.monotonicMs() - startedMs };
}

/** The clock's `sleep`, or a real timer when it has none. */
function _resolveSleep(clock: EtlClock): (ms: number) => Promise<void> {
  return (
    clock.sleep ??
    ((ms: number) => {
      return setTimeout(ms);
    })
  );
}

/**
 * Creates a throttle for one crawl. It keeps the byte budget and the count
 * of failures in a row between requests: one write's time sets the next
 * write's budget.
 *
 * @param options.clock - Times writes, and pauses through its `sleep`, or a
 *   real timer when it has none.
 * @param options.random - A number in `[0, 1)`, which spreads retry waits.
 *   Defaults to `Math.random`.
 * @param options.onEvent - Told of each slow write and transient failure,
 *   before the pause it causes.
 * @returns The throttle.
 */
export function createWriteThrottle(options: {
  clock: EtlClock;
  random?: () => number;
  onEvent?: (event: EtlWriteThrottleEvent) => void;
}): WriteThrottle {
  const sleep = _resolveSleep(options.clock);
  let byteBudget = INITIAL_WRITE_BYTE_BUDGET;
  let failuresInARow = 0;
  const pauseFor = async (event: EtlWriteThrottleEvent): Promise<void> => {
    options.onEvent?.(event);
    await sleep(event.pauseMs);
  };
  const waitAfterFailure = async (error: unknown): Promise<void> => {
    const event = _buildFailureEvent({
      error,
      failureCount: failuresInARow + 1,
      byteBudget,
      random: options.random ?? Math.random,
    });
    failuresInARow += 1;
    byteBudget = event.byteBudget;
    await pauseFor(event);
  };
  return {
    getByteBudget: () => {
      return byteBudget;
    },
    timeWrite: async (write) => {
      const { result, writeMs } = await _timeWrite(options.clock, write);
      const adapted = _adaptToWrite(byteBudget, writeMs);
      byteBudget = adapted.byteBudget;
      failuresInARow = 0;
      if (adapted.event !== undefined) {
        await pauseFor(adapted.event);
      }
      return result;
    },
    waitAfterFailure,
    retryTransient: (request) => {
      return _retryTransient({
        request,
        waitAfterFailure,
        onSuccess: () => {
          failuresInARow = 0;
        },
      });
    },
  };
}

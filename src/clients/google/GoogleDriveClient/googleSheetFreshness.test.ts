import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { GoogleDriveFetch } from "@/clients/google/GoogleDriveClient/GoogleDriveClient.types";

import { describe, expect, it } from "vitest";

import { GlobalAppConfig } from "$/config/GlobalAppConfig";
import {
  clearGoogleSheetFreshness,
  getGoogleSheetFreshness,
  makeGoogleSheetFreshnessCache,
} from "@/clients/google/GoogleDriveClient/googleSheetFreshness";

const DATASET_ID = "11111111-1111-4111-8111-111111111111" as DatasetId;
const OTHER_DATASET_ID = "22222222-2222-4222-8222-222222222222" as DatasetId;
const FILE_ID = "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789";
const ACCESS_TOKEN = "ya29.test-access-token";

const { googleSheetFreshnessDebounceMs: WINDOW_MS } = GlobalAppConfig.timing;

/** A transport that counts calls and answers with a new version each time. */
function _makeCountingFetch(): {
  driveFetch: GoogleDriveFetch;
  callCount: () => number;
} {
  let calls = 0;
  return {
    callCount: () => {
      return calls;
    },
    driveFetch: async () => {
      calls += 1;
      return new Response(JSON.stringify({ version: String(calls) }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  };
}

/** A clock the test moves by hand, so no fake timers are involved. */
function _makeClock(): { now: () => number; advance: (ms: number) => void } {
  let current = 1_700_000_000_000;
  return {
    now: () => {
      return current;
    },
    advance: (ms) => {
      current += ms;
    },
  };
}

describe("getGoogleSheetFreshness", () => {
  it("calls Drive on the first check", async () => {
    // Positive control for every "does not call" assertion below.
    const { driveFetch, callCount } = _makeCountingFetch();
    const cache = makeGoogleSheetFreshnessCache();
    const clock = _makeClock();

    const version = await getGoogleSheetFreshness({
      datasetId: DATASET_ID,
      fileId: FILE_ID,
      accessToken: ACCESS_TOKEN,
      cache,
      now: clock.now,
      driveFetch,
    });

    expect(version).toBe("1");
    expect(callCount()).toBe(1);
  });

  it("reuses the cached version inside the window", async () => {
    const { driveFetch, callCount } = _makeCountingFetch();
    const cache = makeGoogleSheetFreshnessCache();
    const clock = _makeClock();
    const check = () => {
      return getGoogleSheetFreshness({
        datasetId: DATASET_ID,
        fileId: FILE_ID,
        accessToken: ACCESS_TOKEN,
        cache,
        now: clock.now,
        driveFetch,
      });
    };

    await check();
    clock.advance(WINDOW_MS - 1);
    const second = await check();

    expect(callCount()).toBe(1);
    expect(second).toBe("1");
  });

  it("calls Drive again once the window has elapsed", async () => {
    const { driveFetch, callCount } = _makeCountingFetch();
    const cache = makeGoogleSheetFreshnessCache();
    const clock = _makeClock();
    const check = () => {
      return getGoogleSheetFreshness({
        datasetId: DATASET_ID,
        fileId: FILE_ID,
        accessToken: ACCESS_TOKEN,
        cache,
        now: clock.now,
        driveFetch,
      });
    };

    await check();
    clock.advance(WINDOW_MS);
    const second = await check();

    // Both halves of the boundary are asserted, here and in the test above,
    // because a `<` / `<=` slip changes only one of them.
    expect(callCount()).toBe(2);
    expect(second).toBe("2");
  });

  it("keeps a separate window per dataset", async () => {
    const { driveFetch, callCount } = _makeCountingFetch();
    const cache = makeGoogleSheetFreshnessCache();
    const clock = _makeClock();

    await getGoogleSheetFreshness({
      datasetId: DATASET_ID,
      fileId: FILE_ID,
      accessToken: ACCESS_TOKEN,
      cache,
      now: clock.now,
      driveFetch,
    });
    await getGoogleSheetFreshness({
      datasetId: OTHER_DATASET_ID,
      fileId: FILE_ID,
      accessToken: ACCESS_TOKEN,
      cache,
      now: clock.now,
      driveFetch,
    });

    expect(callCount()).toBe(2);
  });
});

describe("clearGoogleSheetFreshness", () => {
  it("forces the next check to call Drive, even inside the window", async () => {
    const { driveFetch, callCount } = _makeCountingFetch();
    const cache = makeGoogleSheetFreshnessCache();
    const clock = _makeClock();
    const check = () => {
      return getGoogleSheetFreshness({
        datasetId: DATASET_ID,
        fileId: FILE_ID,
        accessToken: ACCESS_TOKEN,
        cache,
        now: clock.now,
        driveFetch,
      });
    };

    await check();
    clearGoogleSheetFreshness({ datasetId: DATASET_ID, cache });
    const second = await check();

    expect(callCount()).toBe(2);
    expect(second).toBe("2");
  });

  it("leaves other datasets cached", async () => {
    const { driveFetch, callCount } = _makeCountingFetch();
    const cache = makeGoogleSheetFreshnessCache();
    const clock = _makeClock();
    const check = (datasetId: DatasetId) => {
      return getGoogleSheetFreshness({
        datasetId,
        fileId: FILE_ID,
        accessToken: ACCESS_TOKEN,
        cache,
        now: clock.now,
        driveFetch,
      });
    };

    await check(DATASET_ID);
    await check(OTHER_DATASET_ID);
    clearGoogleSheetFreshness({ datasetId: DATASET_ID, cache });
    await check(OTHER_DATASET_ID);

    // Three calls, not four: clearing one dataset must not clear the cache.
    expect(callCount()).toBe(2);
  });
});

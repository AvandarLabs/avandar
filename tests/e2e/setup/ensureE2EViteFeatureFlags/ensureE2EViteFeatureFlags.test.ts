import { afterEach, describe, expect, it } from "vitest";

import {
  ensureE2EViteFeatureFlags,
  shouldReuseE2EViteServer,
} from "./ensureE2EViteFeatureFlags";

const originalFlags = process.env.VITE_FEATURE_FLAGS;
const originalSpatial = process.env.PLAYWRIGHT_ENABLE_DUCKDB_SPATIAL;

afterEach(() => {
  process.env.VITE_FEATURE_FLAGS = originalFlags;
  process.env.PLAYWRIGHT_ENABLE_DUCKDB_SPATIAL = originalSpatial;
});

describe("ensureE2EViteFeatureFlags", () => {
  it("disables Spatial for normal offline-stable E2E runs", () => {
    process.env.VITE_FEATURE_FLAGS = "enable-shared-with-me";
    delete process.env.PLAYWRIGHT_ENABLE_DUCKDB_SPATIAL;

    ensureE2EViteFeatureFlags();

    expect(process.env.VITE_FEATURE_FLAGS).toContain("disable-duckdb-spatial");
  });

  it("removes the disable flag for an explicit Spatial run", () => {
    process.env.VITE_FEATURE_FLAGS =
      "enable-shared-with-me,disable-duckdb-spatial";
    process.env.PLAYWRIGHT_ENABLE_DUCKDB_SPATIAL = "1";

    ensureE2EViteFeatureFlags();

    expect(process.env.VITE_FEATURE_FLAGS).toBe("enable-shared-with-me");
    expect(shouldReuseE2EViteServer(false)).toBe(false);
  });
});

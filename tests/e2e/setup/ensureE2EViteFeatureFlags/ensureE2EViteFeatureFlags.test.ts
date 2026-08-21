import { afterEach, describe, expect, it } from "vitest";
import { ensureE2EViteFeatureFlags } from "./ensureE2EViteFeatureFlags";

const originalFlags = process.env.VITE_FEATURE_FLAGS;
const originalOffline = process.env.PLAYWRIGHT_E2E_OFFLINE;

afterEach(() => {
  process.env.VITE_FEATURE_FLAGS = originalFlags;
  process.env.PLAYWRIGHT_E2E_OFFLINE = originalOffline;
});

describe("ensureE2EViteFeatureFlags", () => {
  it("leaves Spatial enabled for a default run", () => {
    process.env.VITE_FEATURE_FLAGS = "enable-shared-with-me";
    delete process.env.PLAYWRIGHT_E2E_OFFLINE;

    ensureE2EViteFeatureFlags();

    expect(process.env.VITE_FEATURE_FLAGS).toBe("enable-shared-with-me");
  });

  it("strips a stray disable flag rather than trusting the env", () => {
    process.env.VITE_FEATURE_FLAGS =
      "enable-shared-with-me,disable-duckdb-spatial";
    delete process.env.PLAYWRIGHT_E2E_OFFLINE;

    ensureE2EViteFeatureFlags();

    expect(process.env.VITE_FEATURE_FLAGS).toBe("enable-shared-with-me");
  });

  it("disables Spatial for an explicit offline run", () => {
    process.env.VITE_FEATURE_FLAGS = "enable-shared-with-me";
    process.env.PLAYWRIGHT_E2E_OFFLINE = "1";

    ensureE2EViteFeatureFlags();

    expect(process.env.VITE_FEATURE_FLAGS).toContain("disable-duckdb-spatial");
  });
});

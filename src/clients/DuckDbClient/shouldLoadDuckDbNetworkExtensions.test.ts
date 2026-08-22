import { describe, expect, it } from "vitest";
import { shouldLoadDuckDbNetworkExtensions } from "./shouldLoadDuckDbNetworkExtensions";

describe("shouldLoadDuckDbNetworkExtensions", () => {
  it("returns false when the disable-duckdb-spatial feature flag is on", () => {
    expect(
      shouldLoadDuckDbNetworkExtensions({
        isDisableDuckDbSpatialFlagEnabled: true,
        hasPthreadWorker: false,
      }),
    ).toBe(false);
  });

  it("returns false for the COI pthread bundle (wasm_threads extensions mismatch)", () => {
    expect(
      shouldLoadDuckDbNetworkExtensions({
        isDisableDuckDbSpatialFlagEnabled: false,
        hasPthreadWorker: true,
      }),
    ).toBe(false);
  });

  it("returns true for the single-threaded EH bundle without the flag", () => {
    expect(
      shouldLoadDuckDbNetworkExtensions({
        isDisableDuckDbSpatialFlagEnabled: false,
        hasPthreadWorker: false,
      }),
    ).toBe(true);
  });
});

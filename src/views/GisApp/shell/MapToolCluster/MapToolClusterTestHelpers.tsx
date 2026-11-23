import { vi } from "vitest";
import type { FeatureFlag } from "@/config/FeatureFlagConfig";

/** Hoisted DuckDB spatial availability controlled by the map-tool tests. */
const spatialAvailability = vi.hoisted(() => {
  return {
    value: "unavailable" as "loading" | "available" | "unavailable",
  };
});

/** Hoisted feature flag controlling the test toolbar isochrone slot. */
const isochroneFlag = vi.hoisted(() => {
  return { enabled: false };
});

vi.mock("@/clients/DuckDbClient/DuckDbClient", () => {
  return {
    DuckDbClient: {
      getSpatialAvailability: () => {
        return spatialAvailability.value;
      },
      subscribeSpatialAvailability: () => {
        return () => {
          return undefined;
        };
      },
    },
  };
});

vi.mock("@/config/FeatureFlagConfig", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/config/FeatureFlagConfig")>();
  return {
    ...actual,
    isFlagEnabled: (flag: FeatureFlag) => {
      if (flag === actual.FeatureFlag.EnableGisIsochrone) {
        return isochroneFlag.enabled;
      }
      return actual.isFlagEnabled(flag);
    },
  };
});

export { isochroneFlag, spatialAvailability };

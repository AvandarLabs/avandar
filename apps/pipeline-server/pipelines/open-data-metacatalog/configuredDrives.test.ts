import { describe, expect, it } from "vitest";
import { CONFIGURED_DRIVES } from "@pipelines/open-data-metacatalog/configuredDrives";

describe("CONFIGURED_DRIVES", () => {
  it("has no duplicate (apiService, baseUrl) pair", () => {
    const seen = new Set<string>();
    for (const drive of CONFIGURED_DRIVES) {
      const key = `${drive.apiService}:${drive.baseUrl}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it("every baseUrl is https", () => {
    for (const drive of CONFIGURED_DRIVES) {
      expect(drive.baseUrl.startsWith("https://")).toBe(true);
    }
  });

  it("every baseUrl has no trailing slash", () => {
    for (const drive of CONFIGURED_DRIVES) {
      expect(drive.baseUrl.endsWith("/")).toBe(false);
    }
  });
});

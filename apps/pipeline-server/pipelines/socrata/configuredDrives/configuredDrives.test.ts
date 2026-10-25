import { CONFIGURED_DRIVES } from "@pipelines/socrata/configuredDrives/configuredDrives";
import { describe, expect, it } from "vitest";

describe("CONFIGURED_DRIVES", () => {
  it("has no duplicate baseUrl", () => {
    const keys = CONFIGURED_DRIVES.map((drive) => {
      return drive.baseUrl;
    });

    expect(new Set(keys).size).toBe(keys.length);
  });

  it("every baseUrl is https", () => {
    const allHttps = CONFIGURED_DRIVES.every((drive) => {
      return drive.baseUrl.startsWith("https://");
    });

    expect(allHttps).toBe(true);
  });

  it("every baseUrl has no trailing slash", () => {
    const noneTrailing = CONFIGURED_DRIVES.every((drive) => {
      return !drive.baseUrl.endsWith("/");
    });

    expect(noneTrailing).toBe(true);
  });
});

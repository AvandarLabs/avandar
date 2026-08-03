import { getCurrentUrl } from "@browser-utils/getCurrentUrl/getCurrentUrl";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("getCurrentUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the current window.location.href", () => {
    vi.stubGlobal("window", { location: { href: "https://example.com/foo" } });
    expect(getCurrentUrl()).toBe("https://example.com/foo");
  });

  it("throws when window.location is undefined", () => {
    vi.stubGlobal("window", {});
    expect(() => {
      return getCurrentUrl();
    }).toThrow("window.location is undefined");
  });
});

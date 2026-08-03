import { afterEach, describe, expect, it, vi } from "vitest";
import { navigateToExternalUrl } from "@browser-utils/navigateToExternalUrl/navigateToExternalUrl";

describe("navigateToExternalUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sets window.location.href for same-tab navigation", () => {
    const location = { href: "https://start.example/" };
    vi.stubGlobal("window", { location, open: vi.fn() });

    navigateToExternalUrl("https://target.example/path");

    expect(location.href).toBe("https://target.example/path");
  });

  it("opens a new tab with noopener/noreferrer when openInNewTab is true", () => {
    const open = vi.fn();
    vi.stubGlobal("window", { location: { href: "" }, open });

    navigateToExternalUrl("https://target.example/", { openInNewTab: true });

    expect(open).toHaveBeenCalledWith(
      "https://target.example/",
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("throws when window is undefined", () => {
    vi.stubGlobal("window", undefined);
    expect(() => {
      navigateToExternalUrl("https://target.example/");
    }).toThrow("window is undefined");
  });
});

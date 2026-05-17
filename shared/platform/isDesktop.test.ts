import { afterEach, describe, expect, it } from "vitest";
import { isDesktop } from "$/platform/isDesktop.ts";

type WindowWithMarker = {
  __AVA_PLATFORM__?: string;
};

function getWindow(): WindowWithMarker | undefined {
  return (globalThis as { window?: WindowWithMarker }).window;
}

describe("isDesktop", () => {
  afterEach(() => {
    // jsdom carries window between tests; reset the marker each time
    const w = getWindow();
    if (w !== undefined) {
      delete w.__AVA_PLATFORM__;
    }
    const doc = (globalThis as { document?: Document }).document;
    if (doc !== undefined) {
      delete doc.documentElement.dataset.avaPlatform;
    }
  });

  it("returns false when window has no platform marker", () => {
    expect(isDesktop()).toBe(false);
  });

  it("returns true when window.__AVA_PLATFORM__ is 'desktop'", () => {
    const w = getWindow();
    if (w === undefined) {
      throw new Error("jsdom did not provide a window global for this test");
    }
    w.__AVA_PLATFORM__ = "desktop";
    expect(isDesktop()).toBe(true);
  });

  it("returns true when only <html data-ava-platform='desktop'> is set", () => {
    const doc = (globalThis as { document?: Document }).document;
    if (doc === undefined) {
      throw new Error("jsdom did not provide a document for this test");
    }
    doc.documentElement.dataset.avaPlatform = "desktop";
    expect(isDesktop()).toBe(true);
  });

  it("returns false when window is undefined (SSR / Node)", () => {
    const original = (globalThis as { window?: WindowWithMarker }).window;
    (globalThis as { window?: WindowWithMarker }).window = undefined;
    try {
      expect(isDesktop()).toBe(false);
    } finally {
      (globalThis as { window?: WindowWithMarker }).window = original;
    }
  });
});

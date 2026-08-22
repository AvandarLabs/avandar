import { describe, expect, it } from "vitest";

import { resolveWebviewUrl } from "./url";

describe("resolveWebviewUrl", () => {
  it("returns the Vite dev URL in development", () => {
    const url = resolveWebviewUrl({
      mode: "development",
      viteDevUrl: "http://127.0.0.1:5173",
      bundledIndexPath: "/tmp/should-be-ignored/index.html",
    });
    expect(url).toBe("http://127.0.0.1:5173");
  });

  it("returns a file:// URL pointing at the bundled index in production", () => {
    const url = resolveWebviewUrl({
      mode: "production",
      viteDevUrl: "http://127.0.0.1:5173",
      bundledIndexPath:
        "/Applications/Avandar.app/Contents/Resources/web/index.html",
    });
    expect(url).toBe(
      "file:///Applications/Avandar.app/Contents/Resources/web/index.html",
    );
  });

  it("throws when production mode is missing the bundled index path", () => {
    expect(() => {
      return resolveWebviewUrl({
        mode: "production",
        viteDevUrl: "http://127.0.0.1:5173",
        bundledIndexPath: "",
      });
    }).toThrow(/bundledIndexPath required in production/);
  });
});

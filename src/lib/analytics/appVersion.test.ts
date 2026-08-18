import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("VITE_APP_VERSION", () => {
  it("matches the version in package.json", () => {
    const packageJson = JSON.parse(
      readFileSync(path.resolve(process.cwd(), "package.json"), "utf-8"),
    ) as { version: string };

    expect(import.meta.env.VITE_APP_VERSION).toBe(packageJson.version);
  });
});

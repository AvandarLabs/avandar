import { describe, expect, it } from "vitest";

import { resolveMigrationsDir } from "./resolveMigrationsDir";

describe("resolveMigrationsDir", () => {
  it("returns the dev-source migrations dir in development mode", () => {
    const result = resolveMigrationsDir({
      mode: "development",
      mainDir: "/repo/apps/desktop/main",
      resourcesFolder: "/Applications/Avandar.app/Contents/Resources",
      override: undefined,
    });
    expect(result).toBe("/repo/apps/desktop/migrations");
  });

  it("returns the bundled migrations dir in production mode", () => {
    const result = resolveMigrationsDir({
      mode: "production",
      mainDir: "/repo/apps/desktop/main",
      resourcesFolder: "/Applications/Avandar.app/Contents/Resources",
      override: undefined,
    });
    expect(result).toBe(
      "/Applications/Avandar.app/Contents/Resources/app/migrations",
    );
  });

  it("respects the override regardless of mode", () => {
    expect(
      resolveMigrationsDir({
        mode: "development",
        mainDir: "/repo/apps/desktop/main",
        resourcesFolder: "/whatever",
        override: "/tmp/migrations",
      }),
    ).toBe("/tmp/migrations");

    expect(
      resolveMigrationsDir({
        mode: "production",
        mainDir: "/repo/apps/desktop/main",
        resourcesFolder: "/whatever",
        override: "/tmp/migrations",
      }),
    ).toBe("/tmp/migrations");
  });

  it("treats an empty-string override as 'no override'", () => {
    expect(
      resolveMigrationsDir({
        mode: "development",
        mainDir: "/repo/apps/desktop/main",
        resourcesFolder: "/whatever",
        override: "",
      }),
    ).toBe("/repo/apps/desktop/migrations");
  });
});

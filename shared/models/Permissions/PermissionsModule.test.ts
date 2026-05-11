import { Permissions } from "$/models/Permissions/Permissions.ts";
import { describe, expect, it } from "vitest";

const APP_TYPES = [
  "data_sources",
  "data_explorer",
  "dashboards",
  "settings",
] as const;

const ROLE_LEVELS = ["viewer", "editor", "admin"] as const;

describe("Permissions.PermissionCatalog", () => {
  it("defines each app_type with viewer, editor, and admin keys", () => {
    for (const app of APP_TYPES) {
      for (const role of ROLE_LEVELS) {
        expect(Permissions.PermissionCatalog[app][role]).toBeDefined();
        expect(Array.isArray(Permissions.PermissionCatalog[app][role])).toBe(
          true,
        );
      }
    }
  });

  it("uses unique permission strings within each (app, role) slice", () => {
    for (const app of APP_TYPES) {
      for (const role of ROLE_LEVELS) {
        const keys = [...Permissions.PermissionCatalog[app][role]];
        expect(new Set(keys).size).toBe(keys.length);
      }
    }
  });

  it("includes viewer keys in editor and admin tiers", () => {
    for (const app of APP_TYPES) {
      const viewerKeys = [...Permissions.PermissionCatalog[app].viewer];
      const editorKeys = [...Permissions.PermissionCatalog[app].editor];
      const adminKeys = [...Permissions.PermissionCatalog[app].admin];

      for (const key of viewerKeys) {
        expect(editorKeys.includes(key)).toBe(true);
        expect(adminKeys.includes(key)).toBe(true);
      }

      for (const key of editorKeys) {
        expect(adminKeys.includes(key)).toBe(true);
      }
    }
  });

  it("lists settings permissions only at admin tier", () => {
    expect(Permissions.PermissionCatalog.settings.viewer.length).toBe(0);
    expect(Permissions.PermissionCatalog.settings.editor.length).toBe(0);
    expect(Permissions.PermissionCatalog.settings.admin.length).toBeGreaterThan(
      0,
    );
  });
});

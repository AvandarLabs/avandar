import { Permissions } from "$/models/Permissions/Permissions.ts";
import { RESTRICTABLE_APPS } from "$/models/Permissions/PermissionsModule/RolesMatrixModule/preset-role-matrices.ts";
import { describe, expect, it } from "vitest";

const ROLE_LEVELS = ["viewer", "editor", "admin"] as const;

describe("Permissions.PermissionCatalog", () => {
  it("defines each app_type with viewer, editor, and admin keys", () => {
    RESTRICTABLE_APPS.forEach((app) => {
      ROLE_LEVELS.forEach((role) => {
        expect(Permissions.PermissionCatalog[app][role]).toBeDefined();
        expect(Array.isArray(Permissions.PermissionCatalog[app][role])).toBe(
          true,
        );
      });
    });
  });

  it("uses unique permission strings within each (app, role) slice", () => {
    RESTRICTABLE_APPS.forEach((app) => {
      ROLE_LEVELS.forEach((role) => {
        const keys = [...Permissions.PermissionCatalog[app][role]];
        expect(new Set(keys).size).toBe(keys.length);
      });
    });
  });

  it("includes viewer keys in editor and admin tiers", () => {
    RESTRICTABLE_APPS.forEach((app) => {
      const viewerKeys = [...Permissions.PermissionCatalog[app].viewer];
      const editorKeys = [...Permissions.PermissionCatalog[app].editor];
      const adminKeys = [...Permissions.PermissionCatalog[app].admin];

      viewerKeys.forEach((key) => {
        expect(editorKeys.includes(key)).toBe(true);
        expect(adminKeys.includes(key)).toBe(true);
      });

      editorKeys.forEach((key) => {
        expect(adminKeys.includes(key)).toBe(true);
      });
    });
  });

  it("lists settings permissions only at admin tier", () => {
    expect(Permissions.PermissionCatalog.settings.viewer.length).toBe(0);
    expect(Permissions.PermissionCatalog.settings.editor.length).toBe(0);
    expect(Permissions.PermissionCatalog.settings.admin.length).toBeGreaterThan(
      0,
    );
  });
});

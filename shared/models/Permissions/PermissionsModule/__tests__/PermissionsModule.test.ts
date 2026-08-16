import { Permissions } from "$/models/Permissions/Permissions.ts";
import { PermissionRegistry } from "$/models/Permissions/PermissionsModule/PermissionRegistry.ts";
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

  it("grants dashboards__can_publish_publicly at the admin tier only", () => {
    // Publishing to your own workspace is ordinary editor work. Putting a slice
    // of workspace data on the open internet is not, so the two are separate
    // capabilities rather than one.
    expect(PermissionRegistry.dashboards.viewer).not.toContain(
      "dashboards__can_publish_publicly",
    );
    expect(PermissionRegistry.dashboards.editor).not.toContain(
      "dashboards__can_publish_publicly",
    );
    expect(PermissionRegistry.dashboards.admin).toContain(
      "dashboards__can_publish_publicly",
    );
  });
});

describe("Permissions.getPermissionsForAppRole", () => {
  it("includes viewer and editor keys for an editor", () => {
    const keys = Permissions.getPermissionsForAppRole({
      app: "dashboards",
      role: "editor",
    });

    expect(keys.has("dashboards__can_view_dashboard")).toBe(true);
    expect(keys.has("dashboards__can_edit_dashboard")).toBe(true);
    expect(keys.has("dashboards__can_manage_dashboards")).toBe(false);
  });

  it("includes only viewer-tier keys for a viewer", () => {
    const keys = Permissions.getPermissionsForAppRole({
      app: "data_sources",
      role: "viewer",
    });

    expect(keys.has("data_sources__can_view_dataset")).toBe(true);
    expect(keys.has("data_sources__can_list_sources")).toBe(true);
    expect(keys.has("data_sources__can_edit_dataset")).toBe(false);
  });

  it("includes all tiers for admin", () => {
    const keys = Permissions.getPermissionsForAppRole({
      app: "data_sources",
      role: "admin",
    });

    expect(keys.has("data_sources__can_manage_sources")).toBe(true);
    expect(keys.has("data_sources__can_edit_dataset")).toBe(true);
    expect(keys.has("data_sources__can_view_dataset")).toBe(true);
  });
});

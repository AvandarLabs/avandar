import { describe, expect, it } from "vitest";
import { Permissions } from "$/models/Permissions/Permissions.ts";
import type {
  AppType,
  PermissionKey,
  UserAppRolesMatrix,
} from "$/models/Permissions/Permissions.types.ts";

const PERMISSIONS_THAT_DEFINE_ROUTE_ACCESS = {
  data_sources: "data_sources__can_list_sources",
  data_explorer: "data_explorer__can_run_query",
  dashboards: "dashboards__can_view_dashboard",
  gis: "gis__can_view_map",
  case_types: "case_types__can_view_case_type",
  case_records: "case_records__can_view_record",
  settings: "settings__can_manage_workspace_users",
} as const satisfies Record<AppType, PermissionKey>;

const WORKSPACE_ROUTE_APPS = Permissions.RestrictableApps.filter(
  (app): app is Exclude<AppType, "settings"> => {
    return app !== "settings";
  },
);

function rolesMatrixWithAppRole(
  app: AppType,
  role: "viewer" | "editor" | "admin" | undefined,
): UserAppRolesMatrix {
  return {
    data_sources: app === "data_sources" ? role : undefined,
    data_explorer: app === "data_explorer" ? role : undefined,
    dashboards: app === "dashboards" ? role : undefined,
    gis: app === "gis" ? role : undefined,
    case_types: app === "case_types" ? role : undefined,
    case_records: app === "case_records" ? role : undefined,
    settings: app === "settings" ? role : undefined,
  };
}

function rolesMatrixWithoutApp(app: AppType): UserAppRolesMatrix {
  return { ...Permissions.RolesMatrix.Builtins.GlobalViewer, [app]: undefined };
}

describe("gis app permissions", () => {
  it("evaluates viewer, editor, and admin access through the public API", () => {
    const viewerRoles = rolesMatrixWithAppRole("gis", "viewer");
    const editorRoles = rolesMatrixWithAppRole("gis", "editor");
    const adminRoles = rolesMatrixWithAppRole("gis", "admin");

    expect(
      Permissions.rolesMatrixHasPermission({
        roles: viewerRoles,
        permissionKey: "gis__can_view_map",
      }),
    ).toBe(true);
    expect(
      Permissions.rolesMatrixHasPermission({
        roles: viewerRoles,
        permissionKey: "gis__can_edit_map",
      }),
    ).toBe(false);
    expect(
      Permissions.rolesMatrixHasPermission({
        roles: editorRoles,
        permissionKey: "gis__can_edit_map",
      }),
    ).toBe(true);
    expect(
      Permissions.rolesMatrixHasPermission({
        roles: editorRoles,
        permissionKey: "gis__can_manage_maps",
      }),
    ).toBe(false);
    expect(
      Permissions.rolesMatrixHasPermission({
        roles: adminRoles,
        permissionKey: "gis__can_manage_maps",
      }),
    ).toBe(true);
  });
});

describe("case app permissions", () => {
  it("grants case type creation and editing at case_types editor", () => {
    const editorRoles = rolesMatrixWithAppRole("case_types", "editor");

    expect(
      Permissions.rolesMatrixHasPermission({
        roles: editorRoles,
        permissionKey: "case_types__can_create_case_type",
      }),
    ).toBe(true);
    expect(
      Permissions.rolesMatrixHasPermission({
        roles: editorRoles,
        permissionKey: "case_types__can_edit_case_type",
      }),
    ).toBe(true);
  });

  it("withholds case type deletion until case_types admin", () => {
    expect(
      Permissions.rolesMatrixHasPermission({
        roles: rolesMatrixWithAppRole("case_types", "editor"),
        permissionKey: "case_types__can_delete_case_type",
      }),
    ).toBe(false);
    expect(
      Permissions.rolesMatrixHasPermission({
        roles: rolesMatrixWithAppRole("case_types", "admin"),
        permissionKey: "case_types__can_delete_case_type",
      }),
    ).toBe(true);
  });

  it("grants record syncing to an editor of either case app", () => {
    expect(
      Permissions.rolesMatrixHasPermission({
        roles: rolesMatrixWithAppRole("case_types", "editor"),
        permissionKey: "case_types__can_sync_records",
      }),
    ).toBe(true);
    expect(
      Permissions.rolesMatrixHasPermission({
        roles: rolesMatrixWithAppRole("case_records", "editor"),
        permissionKey: "case_records__can_sync_records",
      }),
    ).toBe(true);
  });

  it("withholds record syncing from a case_records viewer", () => {
    expect(
      Permissions.rolesMatrixHasPermission({
        roles: rolesMatrixWithAppRole("case_records", "viewer"),
        permissionKey: "case_records__can_sync_records",
      }),
    ).toBe(false);
  });

  it("withholds record deletion until case_records admin", () => {
    expect(
      Permissions.rolesMatrixHasPermission({
        roles: rolesMatrixWithAppRole("case_records", "editor"),
        permissionKey: "case_records__can_delete_record",
      }),
    ).toBe(false);
    expect(
      Permissions.rolesMatrixHasPermission({
        roles: rolesMatrixWithAppRole("case_records", "admin"),
        permissionKey: "case_records__can_delete_record",
      }),
    ).toBe(true);
  });

  it("keeps Records closed to a case_types admin with no case_records role", () => {
    expect(
      Permissions.rolesMatrixHasPermission({
        roles: rolesMatrixWithAppRole("case_types", "admin"),
        permissionKey: "case_records__can_view_record",
      }),
    ).toBe(false);
  });
});

describe("Permissions.parseAppTypeFromPermissionKey", () => {
  it("resolves data_sources keys", () => {
    expect(
      Permissions.parseAppTypeFromPermissionKey(
        "data_sources__can_edit_dataset",
      ),
    ).toBe("data_sources");
  });

  it("resolves each restrictable app prefix", () => {
    expect(
      Permissions.parseAppTypeFromPermissionKey("data_explorer__can_run_query"),
    ).toBe("data_explorer");
    expect(
      Permissions.parseAppTypeFromPermissionKey(
        "dashboards__can_view_dashboard",
      ),
    ).toBe("dashboards");
    expect(
      Permissions.parseAppTypeFromPermissionKey(
        "settings__can_manage_workspace_users",
      ),
    ).toBe("settings");
  });

  it("returns undefined for unknown prefixes", () => {
    expect(
      Permissions.parseAppTypeFromPermissionKey("unknown__x" as PermissionKey),
    ).toBe(undefined);
  });
});

describe("Permissions.rolesMatrixHasPermission", () => {
  it("returns false for an unknown permission prefix", () => {
    expect(
      Permissions.rolesMatrixHasPermission({
        roles: Permissions.RolesMatrix.Builtins.GlobalAdmin,
        permissionKey: "unknown__x" as PermissionKey,
      }),
    ).toBe(false);
  });
});

describe("Permissions.workspace app route catalog permissions", () => {
  WORKSPACE_ROUTE_APPS.forEach((app) => {
    const routePermission = PERMISSIONS_THAT_DEFINE_ROUTE_ACCESS[app];

    it(`denies ${app} route permission when app role is unset`, () => {
      expect(
        Permissions.rolesMatrixHasPermission({
          roles: rolesMatrixWithoutApp(app),
          permissionKey: routePermission,
        }),
      ).toBe(false);
    });

    it(`grants ${app} route permission for viewer`, () => {
      expect(
        Permissions.rolesMatrixHasPermission({
          roles: rolesMatrixWithAppRole(app, "viewer"),
          permissionKey: routePermission,
        }),
      ).toBe(true);
    });

    it(`grants ${app} route permission for editor`, () => {
      expect(
        Permissions.rolesMatrixHasPermission({
          roles: rolesMatrixWithAppRole(app, "editor"),
          permissionKey: routePermission,
        }),
      ).toBe(true);
    });

    it(`grants ${app} route permission for admin`, () => {
      expect(
        Permissions.rolesMatrixHasPermission({
          roles: rolesMatrixWithAppRole(app, "admin"),
          permissionKey: routePermission,
        }),
      ).toBe(true);
    });
  });

  it("denies settings route permission for Global Viewer", () => {
    expect(
      Permissions.rolesMatrixHasPermission({
        roles: Permissions.RolesMatrix.Builtins.GlobalViewer,
        permissionKey: "settings__can_manage_workspace_users",
      }),
    ).toBe(false);
  });

  it("denies settings route permission for Global Editor", () => {
    expect(
      Permissions.rolesMatrixHasPermission({
        roles: Permissions.RolesMatrix.Builtins.GlobalEditor,
        permissionKey: "settings__can_manage_workspace_users",
      }),
    ).toBe(false);
  });

  it("grants settings route permission for Global Admin", () => {
    expect(
      Permissions.rolesMatrixHasPermission({
        roles: Permissions.RolesMatrix.Builtins.GlobalAdmin,
        permissionKey: "settings__can_manage_workspace_users",
      }),
    ).toBe(true);
  });

  it("denies editor-only keys when member is viewer for that app", () => {
    const roles = rolesMatrixWithAppRole("dashboards", "viewer");
    expect(
      Permissions.rolesMatrixHasPermission({
        roles,
        permissionKey: "dashboards__can_view_dashboard",
      }),
    ).toBe(true);
    expect(
      Permissions.rolesMatrixHasPermission({
        roles,
        permissionKey: "dashboards__can_edit_dashboard",
      }),
    ).toBe(false);
    expect(
      Permissions.rolesMatrixHasPermission({
        roles,
        permissionKey: "dashboards__can_manage_dashboards",
      }),
    ).toBe(false);
  });
});

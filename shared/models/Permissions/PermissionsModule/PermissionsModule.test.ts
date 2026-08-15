import { Permissions } from "$/models/Permissions/Permissions.ts";
import { PermissionRegistry } from "$/models/Permissions/PermissionsModule/PermissionRegistry.ts";
import { RESTRICTABLE_APPS } from "$/models/Permissions/PermissionsModule/RolesMatrixModule/preset-role-matrices.ts";
import { describe, expect, it } from "vitest";
import type {
  AppType,
  PermissionKey,
  UserAppRolesMatrix,
} from "$/models/Permissions/Permissions.types.ts";
import type { WorkspaceId } from "$/models/Workspace/Workspace.types.ts";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types.ts";

const PERMISSIONS_THAT_DEFINE_ROUTE_ACCESS = {
  data_sources: "data_sources__can_list_sources",
  data_explorer: "data_explorer__can_run_query",
  dashboards: "dashboards__can_view_dashboard",
  gis: "gis__can_view_map",
  settings: "settings__can_manage_workspace_users",
} as const satisfies Record<AppType, PermissionKey>;

const ROLE_LEVELS = ["viewer", "editor", "admin"] as const;

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
    settings: app === "settings" ? role : undefined,
  };
}

function rolesMatrixWithoutApp(app: AppType): UserAppRolesMatrix {
  return { ...Permissions.RolesMatrix.Builtins.GlobalViewer, [app]: undefined };
}

const WORKSPACE_ID = "00000000-0000-4000-8000-000000000001" as WorkspaceId;

/**
 * Minimal chain mock matching `buildInitialCustomRoleGroupName` queries.
 */
function _createMockRoleGroupsDb(options: {
  nonBuiltinCount: number | null;
  isNameTaken: (name: string) => boolean;
}): AvaSupabaseDBClient {
  return {
    from(table: string) {
      if (table !== "role_groups") {
        throw new Error(`Unexpected table: ${table}`);
      }
      return {
        select(columns: string, opts?: { count?: string; head?: boolean }) {
          const isCountHead =
            columns === "*" && opts?.count === "exact" && opts?.head === true;
          if (isCountHead) {
            return {
              eq() {
                return {
                  eq() {
                    return {
                      async throwOnError() {
                        return {
                          count: options.nonBuiltinCount,
                          data: null,
                          error: null,
                        };
                      },
                    };
                  },
                };
              },
            };
          }
          return {
            eq() {
              return {
                eq(_column: string, name: string) {
                  return {
                    maybeSingle() {
                      return {
                        async throwOnError() {
                          return {
                            data:
                              options.isNameTaken(name) ?
                                { id: "existing" }
                              : null,
                            error: null,
                          };
                        },
                      };
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  } as unknown as AvaSupabaseDBClient;
}

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

describe("Permissions.buildInitialCustomRoleGroupName", () => {
  it("uses Custom Role Group 1 when no non-built-in groups exist", async () => {
    const db = _createMockRoleGroupsDb({
      nonBuiltinCount: 0,
      isNameTaken: () => {
        return false;
      },
    });
    const name = await Permissions.buildInitialCustomRoleGroupName({
      db,
      workspaceId: WORKSPACE_ID,
    });
    expect(name).toBe("Custom Role Group 1");
  });

  it("bumps N while the candidate name collides", async () => {
    const taken = new Set(["Custom Role Group 1", "Custom Role Group 2"]);
    const db = _createMockRoleGroupsDb({
      nonBuiltinCount: 0,
      isNameTaken: (candidate) => {
        return taken.has(candidate);
      },
    });
    const name = await Permissions.buildInitialCustomRoleGroupName({
      db,
      workspaceId: WORKSPACE_ID,
    });
    expect(name).toBe("Custom Role Group 3");
  });

  it("starts after existing non-built-in groups when names are free", async () => {
    const db = _createMockRoleGroupsDb({
      nonBuiltinCount: 2,
      isNameTaken: () => {
        return false;
      },
    });
    const name = await Permissions.buildInitialCustomRoleGroupName({
      db,
      workspaceId: WORKSPACE_ID,
    });
    expect(name).toBe("Custom Role Group 3");
  });
});

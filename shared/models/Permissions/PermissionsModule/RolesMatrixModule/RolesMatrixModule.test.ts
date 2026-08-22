import { describe, expect, it } from "vitest";
import { BUILTIN_ROLE_GROUP_NAMES } from "$/models/Permissions/PermissionsModule/RolesMatrixModule/preset-role-matrices.ts";
import { RolesMatrixModule } from "$/models/Permissions/PermissionsModule/RolesMatrixModule/RolesMatrixModule.ts";
import type { UserAppRolesMatrix } from "$/models/Permissions/Permissions.types.ts";

describe("RolesMatrixModule", () => {
  it("areRoleMatricesEqual is true for identical matrices", () => {
    const viewer = { ...RolesMatrixModule.Builtins.GlobalViewer };
    expect(
      RolesMatrixModule.areRoleMatricesEqual(
        RolesMatrixModule.Builtins.GlobalViewer,
        viewer,
      ),
    ).toBe(true);
  });

  it("areRoleMatricesEqual is false when one app differs", () => {
    expect(
      RolesMatrixModule.areRoleMatricesEqual(
        RolesMatrixModule.Builtins.GlobalViewer,
        {
          ...RolesMatrixModule.Builtins.GlobalViewer,
          data_sources: "admin",
        },
      ),
    ).toBe(false);
  });

  it("diffBaseMatrixWithOverrides lists apps that differ with a concrete role", () => {
    const target: UserAppRolesMatrix = {
      ...RolesMatrixModule.Builtins.GlobalViewer,
      data_sources: "admin",
    };
    expect(
      RolesMatrixModule.diffBaseMatrixWithOverrides(
        RolesMatrixModule.Builtins.GlobalViewer,
        target,
      ),
    ).toEqual([{ app: "data_sources", role: "admin" }]);
  });

  it("applyRoleOverridesToMatrix merges overrides onto a base matrix", () => {
    const result = RolesMatrixModule.applyRoleOverridesToMatrix(
      RolesMatrixModule.Builtins.GlobalViewer,
      [{ app: "data_sources", role: "admin" }],
    );
    expect(result.data_sources).toBe("admin");
    expect(result.data_explorer).toBe(
      RolesMatrixModule.Builtins.GlobalViewer.data_explorer,
    );
  });

  it("roleMatrixFromBuiltinRoleGroupName returns built-in matrices", () => {
    expect(
      RolesMatrixModule.roleMatrixFromBuiltinRoleGroupName(
        BUILTIN_ROLE_GROUP_NAMES.globalAdmin,
      ),
    ).toEqual(RolesMatrixModule.Builtins.GlobalAdmin);
    expect(
      RolesMatrixModule.roleMatrixFromBuiltinRoleGroupName(
        BUILTIN_ROLE_GROUP_NAMES.globalEditor,
      ),
    ).toEqual(RolesMatrixModule.Builtins.GlobalEditor);
    expect(
      RolesMatrixModule.roleMatrixFromBuiltinRoleGroupName(
        BUILTIN_ROLE_GROUP_NAMES.globalViewer,
      ),
    ).toEqual(RolesMatrixModule.Builtins.GlobalViewer);
  });

  it("roleMatrixFromBuiltinRoleGroupName returns undefined for unknown names", () => {
    expect(
      RolesMatrixModule.roleMatrixFromBuiltinRoleGroupName("Unknown Group"),
    ).toBe(undefined);
  });

  it("roleGroupPresetTypeFromRoleMatrix classifies built-in matrices", () => {
    expect(
      RolesMatrixModule.roleGroupPresetTypeFromRoleMatrix(
        RolesMatrixModule.Builtins.GlobalAdmin,
      ),
    ).toBe("global_admin");
    expect(
      RolesMatrixModule.roleGroupPresetTypeFromRoleMatrix(
        RolesMatrixModule.Builtins.GlobalEditor,
      ),
    ).toBe("global_editor");
    expect(
      RolesMatrixModule.roleGroupPresetTypeFromRoleMatrix(
        RolesMatrixModule.Builtins.GlobalViewer,
      ),
    ).toBe("global_viewer");
  });

  it("roleGroupPresetTypeFromRoleMatrix returns custom for non-built-in matrices", () => {
    expect(
      RolesMatrixModule.roleGroupPresetTypeFromRoleMatrix({
        ...RolesMatrixModule.Builtins.GlobalViewer,
        data_sources: "admin",
      }),
    ).toBe("custom");
  });

  it("roleMatrixFromPresetType matches each built-in matrix", () => {
    expect(
      RolesMatrixModule.areRoleMatricesEqual(
        RolesMatrixModule.roleMatrixFromPresetType("global_admin"),
        RolesMatrixModule.Builtins.GlobalAdmin,
      ),
    ).toBe(true);
    expect(
      RolesMatrixModule.areRoleMatricesEqual(
        RolesMatrixModule.roleMatrixFromPresetType("global_editor"),
        RolesMatrixModule.Builtins.GlobalEditor,
      ),
    ).toBe(true);
    expect(
      RolesMatrixModule.areRoleMatricesEqual(
        RolesMatrixModule.roleMatrixFromPresetType("global_viewer"),
        RolesMatrixModule.Builtins.GlobalViewer,
      ),
    ).toBe(true);
  });

  it("rows round-trip through rowsToUserAppRolesMatrix and userAppRolesMatrixToRows", () => {
    const rows = [
      { app: "data_sources" as const, role: "viewer" as const },
      { app: "dashboards" as const, role: "admin" as const },
    ];
    const matrix = RolesMatrixModule.rowsToUserAppRolesMatrix(rows);
    expect(RolesMatrixModule.userAppRolesMatrixToRows(matrix)).toEqual(rows);
  });
});

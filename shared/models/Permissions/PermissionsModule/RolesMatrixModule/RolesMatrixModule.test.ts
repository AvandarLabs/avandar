import { RolesMatrixModule } from "$/models/Permissions/PermissionsModule/RolesMatrixModule/RolesMatrixModule.ts";
import { describe, expect, it } from "vitest";
import type { UserAppRolesMatrix } from "$/models/Permissions/Permissions.types.ts";

describe("RoleMatrixModule", () => {
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

  it("roleMatrixFromPresetType matches built-in admin matrix", () => {
    expect(
      RolesMatrixModule.areRoleMatricesEqual(
        RolesMatrixModule.roleMatrixFromPresetType("global_admin"),
        RolesMatrixModule.Builtins.GlobalAdmin,
      ),
    ).toBe(true);
  });

  it("rows round-trip through rowsToUserAppRolesMatrix and UserAppRolesMatrixToRows", () => {
    const rows = [
      { app: "data_sources" as const, role: "viewer" as const },
      { app: "dashboards" as const, role: "admin" as const },
    ];
    const matrix = RolesMatrixModule.rowsToUserAppRolesMatrix(rows);
    expect(RolesMatrixModule.userAppRolesMatrixToRows(matrix)).toEqual(rows);
  });
});

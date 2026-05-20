import { useLingui } from "@lingui/react/macro";
import { Radio, SegmentedControl, Stack, Table, Text } from "@mantine/core";
import { matchLiteral } from "@utils";
import { Permissions } from "$/models/Permissions/Permissions";
import { RESTRICTABLE_APPS } from "$/models/Permissions/PermissionsModule/RolesMatrixModule/preset-role-matrices";
import type {
  AppType,
  RoleLevel,
  UserAppRolesMatrix,
} from "$/models/Permissions/Permissions.types";

type AppTypeCellValue = RoleLevel | "none";

const CELL_OPTIONS: readonly AppTypeCellValue[] = [
  "none",
  "viewer",
  "editor",
  "admin",
] as const;

/** Returns a localized display label for an app type. */
function _useAppTypeLabel(): (app: AppType) => string {
  const { t } = useLingui();
  return (app: AppType) => {
    return matchLiteral(app, {
      data_sources: t`Data Sources`,
      data_explorer: t`Data Explorer`,
      dashboards: t`Dashboards`,
      settings: t`Settings`,
    });
  };
}

/** Returns a localized display label for a role-matrix cell value. */
function _useCellValueLabel(): (cell: AppTypeCellValue) => string {
  const { t } = useLingui();
  return (cell: AppTypeCellValue) => {
    return matchLiteral(cell, {
      none: t`None`,
      viewer: t`Viewer`,
      editor: t`Editor`,
      admin: t`Admin`,
    });
  };
}

/** Returns the localized preset-role segmented control options. */
function _usePresetRoleData(): ReadonlyArray<{
  label: string;
  value: "global_admin" | "global_editor" | "global_viewer" | "custom";
}> {
  const { t } = useLingui();
  return [
    { label: t`Global Admin`, value: "global_admin" },
    { label: t`Global Editor`, value: "global_editor" },
    { label: t`Global Viewer`, value: "global_viewer" },
    { label: t`Custom`, value: "custom" },
  ];
}

type Props = {
  rolesMatrix: UserAppRolesMatrix;
  onRolesMatrixChange: (next: UserAppRolesMatrix) => void;
  builtinPresetTypes:
    | "global_admin"
    | "global_editor"
    | "global_viewer"
    | "custom";
  onBuiltinPresetTypeChange: (
    next: "global_admin" | "global_editor" | "global_viewer" | "custom",
  ) => void;
  disabled?: boolean;
};

/**
 * Per-app role matrix editor with a built-in preset segmented control.
 */
export function WorkspaceAppRoleMatrixForm({
  rolesMatrix,
  onRolesMatrixChange,
  builtinPresetTypes,
  onBuiltinPresetTypeChange,
  disabled,
}: Props): JSX.Element {
  const { t } = useLingui();
  const presetRoleData = _usePresetRoleData();
  const appTypeToLabel = _useAppTypeLabel();
  const appTypeCellValueToLabel = _useCellValueLabel();
  return (
    <Stack gap="md">
      <SegmentedControl
        data={[...presetRoleData]}
        value={builtinPresetTypes}
        onChange={(value) => {
          onBuiltinPresetTypeChange(
            value as
              | "global_admin"
              | "global_editor"
              | "global_viewer"
              | "custom",
          );
          if (value !== "custom") {
            onRolesMatrixChange(
              Permissions.RolesMatrix.roleMatrixFromPresetType(
                value as "global_admin" | "global_editor" | "global_viewer",
              ),
            );
          }
        }}
        disabled={disabled}
        fullWidth
      />
      <Table withTableBorder withColumnBorders>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t`App`}</Table.Th>
            {CELL_OPTIONS.map((cell) => {
              return (
                <Table.Th key={cell} ta="center">
                  <Text size="sm">{appTypeCellValueToLabel(cell)}</Text>
                </Table.Th>
              );
            })}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {RESTRICTABLE_APPS.map((app) => {
            return (
              <Table.Tr key={app}>
                <Table.Td>
                  <Text size="sm" fw={500}>
                    {appTypeToLabel(app)}
                  </Text>
                </Table.Td>
                {CELL_OPTIONS.map((cell) => {
                  const appTypeRole = rolesMatrix[app] ?? "none";
                  const selected = appTypeRole === cell;
                  return (
                    <Table.Td key={cell} ta="center">
                      <Radio
                        checked={selected}
                        onChange={() => {
                          onBuiltinPresetTypeChange("custom");
                          onRolesMatrixChange({
                            ...rolesMatrix,
                            [app]: cell === "none" ? undefined : cell,
                          });
                        }}
                        disabled={disabled}
                        aria-label={`${appTypeToLabel(app)} ${appTypeCellValueToLabel(cell)}`}
                      />
                    </Table.Td>
                  );
                })}
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}

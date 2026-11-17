import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { Stack, Text } from "@mantine/core";
import { UninstallContentRow } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/UninstallContentRow";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type { UninstallContentRow as Row } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/useUninstallContentRows/useUninstallContentRows";

type Props = Readonly<{
  rows: readonly Row[];

  /** Imports whose dataset the user cannot see, counted and never listed. */
  hiddenCount: number;
  installationId: PluginInstallation.Id;
  checkedIds: ReadonlySet<Dataset.Id>;
  isDisabled: boolean;
  onIsCheckedChange: (datasetId: Dataset.Id, isChecked: boolean) => void;
}>;

/**
 * The datasets a plugin imported, in the uninstall modal, one row each and
 * then a count of the ones the user cannot see. It is the group that holds
 * the "Delete <name>" checkboxes.
 */
export function UninstallContentList({
  rows,
  hiddenCount,
  installationId,
  checkedIds,
  isDisabled,
  onIsCheckedChange,
}: Props): JSX.Element {
  const { t } = useLingui();
  return (
    <Stack gap="sm" role="group" aria-label={t`Datasets it imported`}>
      {rows.map((row) => {
        return (
          <UninstallContentRow
            key={row.datasetId}
            row={row}
            installationId={installationId}
            isChecked={checkedIds.has(row.datasetId)}
            isDisabled={isDisabled}
            onIsCheckedChange={(isChecked) => {
              onIsCheckedChange(row.datasetId, isChecked);
            }}
          />
        );
      })}
      {hiddenCount > 0 ? (
        <Text size="sm" c="dimmed">
          {plural(hiddenCount, {
            one: "# more dataset you can't see stays.",
            other: "# more datasets you can't see stay.",
          })}
        </Text>
      ) : null}
    </Stack>
  );
}

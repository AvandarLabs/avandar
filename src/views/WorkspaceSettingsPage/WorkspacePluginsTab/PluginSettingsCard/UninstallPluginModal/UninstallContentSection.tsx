import { useLingui } from "@lingui/react/macro";
import { Loader, Stack, Text, Title } from "@mantine/core";
import { useId } from "react";
import { PluginLookupErrorCallout } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginLookupErrorCallout";
import { UninstallContentList } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/UninstallContentList";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type { UninstallContentRows } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/useUninstallContentRows/useUninstallContentRows";

type Props = Readonly<{
  content: UninstallContentRows;
  installationId: PluginInstallation.Id;
  checkedIds: ReadonlySet<Dataset.Id>;
  isDisabled: boolean;
  onIsCheckedChange: (datasetId: Dataset.Id, isChecked: boolean) => void;
}>;

/**
 * The "Datasets it imported" part of the uninstall modal: a heading, then a
 * loader while the datasets load or the list of them. The list and the note
 * that unchecked datasets stay are left out when there is nothing to choose.
 * When the datasets could not be loaded, an alert with a Retry replaces the
 * list, and the note says every dataset stays.
 */
export function UninstallContentSection({
  content,
  installationId,
  checkedIds,
  isDisabled,
  onIsCheckedChange,
}: Props): JSX.Element {
  const { t } = useLingui();
  const headingId = useId();
  const { rows, hiddenCount, isLoading, hasFailed, retry } = content;
  const hasListedContent = rows.length > 0 || hiddenCount > 0;
  const canDeleteAny = rows.some((row) => {
    return row.canDelete;
  });
  return (
    <Stack gap="md">
      {/* Order 3 nests this under the modal's order 2 title. */}
      <Title id={headingId} order={3} size="h6">
        {t`Datasets it imported`}
      </Title>
      {isLoading ? (
        <Loader size="sm" role="status" aria-label={t`Loading datasets`} />
      ) : null}
      {!isLoading && hasFailed ? (
        <>
          <PluginLookupErrorCallout
            message={t`We could not load the datasets this plugin imported.`}
            onRetry={retry}
          />
          <Text size="sm" c="dimmed">
            {t`Every dataset it imported stays in Data Sources.`}
          </Text>
        </>
      ) : null}
      {!isLoading && !hasFailed && hasListedContent ? (
        <UninstallContentList
          rows={rows}
          hiddenCount={hiddenCount}
          installationId={installationId}
          checkedIds={checkedIds}
          isDisabled={isDisabled}
          onIsCheckedChange={onIsCheckedChange}
          labelId={headingId}
        />
      ) : null}
      {!isLoading && !hasFailed && canDeleteAny ? (
        <Text size="sm" c="dimmed">
          {t`Unchecked datasets stay in Data Sources.`}
        </Text>
      ) : null}
    </Stack>
  );
}

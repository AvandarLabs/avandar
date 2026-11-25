import { useLingui } from "@lingui/react/macro";
import { Loader, Stack, Title } from "@mantine/core";
import { useId } from "react";
import { UninstallContentChoices } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/UninstallContentChoices";
import { UninstallContentFailure } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/UninstallContentFailure";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type { UninstallContentRows } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/useUninstallContentRows/useUninstallContentRows";
import type { LookupState } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/useLookupState/useLookupState";

type Props = Readonly<{
  content: UninstallContentRows;
  installationId: PluginInstallation.Id;
  checkedIds: ReadonlySet<Dataset.Id>;
  isDisabled: boolean;
  onIsCheckedChange: (datasetId: Dataset.Id, isChecked: boolean) => void;
}>;

/** Where the dataset lookups stand, as the failure alert needs it. */
function _buildLookupState(content: UninstallContentRows): LookupState {
  if (content.hasFailed) {
    return "failed";
  }
  return content.isRetrying ? "retrying" : "ok";
}

/**
 * The "Datasets it imported" part of the uninstall modal: a heading, then a
 * loader while the datasets load, or the list of them. When the datasets
 * could not be loaded, an alert with a Retry replaces the list, and a note
 * says every dataset stays.
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
  const lookupState = _buildLookupState(content);
  const isShowingChoices = !content.isLoading && lookupState === "ok";
  return (
    <Stack gap="md">
      {/* Order 3 nests this under the modal's order 2 title. */}
      <Title id={headingId} order={3} size="h6">
        {t`Datasets it imported`}
      </Title>
      <UninstallContentFailure state={lookupState} onRetry={content.retry} />
      {content.isLoading && lookupState === "ok" ? (
        <Loader size="sm" role="status" aria-label={t`Loading datasets`} />
      ) : null}
      {isShowingChoices ? (
        <UninstallContentChoices
          {...{ content, installationId, checkedIds, isDisabled }}
          onIsCheckedChange={onIsCheckedChange}
          labelId={headingId}
        />
      ) : null}
    </Stack>
  );
}

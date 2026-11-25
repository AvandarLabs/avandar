import { Trans, useLingui } from "@lingui/react/macro";
import { Loader, Stack, Text } from "@mantine/core";
import { DependentsList } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/UninstallDatasetDependents/DependentsList";
import { useDatasetDependents } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/useDatasetDependents/useDatasetDependents";
import { useReportDependentsLoading } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/useDependentsLoading/useDependentsLoading";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";

type Props = Readonly<{
  datasetId: Dataset.Id;

  /** The install being uninstalled, whose own bindings are left out. */
  installationId: PluginInstallation.Id;
}>;

/**
 * Under a dataset marked for deletion in the uninstall modal, what reads it
 * and stops working once it is deleted. Renders nothing when nothing does and
 * every lookup succeeded. When a lookup failed, it says so instead of
 * reading the missing answer as "nothing reads this". It indents what it
 * renders under the dataset's checkbox, so its caller needs no wrapper that
 * could be left empty. While it loads, it tells the uninstall modal, which
 * keeps its confirm button disabled until the admin can see the list.
 */
export function UninstallDatasetDependents({
  datasetId,
  installationId,
}: Props): JSX.Element | null {
  const { t } = useLingui();
  const { dependents, isLoading, hasFailed } = useDatasetDependents({
    datasetId,
    installationId,
  });
  useReportDependentsLoading({ datasetId, isLoading });
  if (isLoading) {
    return (
      <Loader
        size="xs"
        ml="xl"
        role="status"
        aria-label={t`Checking what reads this dataset`}
      />
    );
  }
  if (dependents.length === 0 && !hasFailed) {
    return null;
  }
  return (
    <Stack gap="xxs" pl="xl">
      {dependents.length > 0 ? (
        <DependentsList dependents={dependents} />
      ) : null}
      {hasFailed ? (
        <Text size="sm" c="warning.8" role="alert">
          <Trans>We could not load what reads this dataset.</Trans>
        </Text>
      ) : null}
    </Stack>
  );
}

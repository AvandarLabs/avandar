import { Trans, useLingui } from "@lingui/react/macro";
import { List, Loader, Stack, Text } from "@mantine/core";
import { useDatasetDependents } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/useDatasetDependents/useDatasetDependents";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type { DatasetDependent } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/useDatasetDependents/useDatasetDependents";

type Props = Readonly<{
  datasetId: Dataset.Id;

  /** The install being uninstalled, whose own bindings are left out. */
  installationId: PluginInstallation.Id;
}>;

/**
 * The things that read a dataset, each labelled with how it reads it. Used
 * by `UninstallDatasetDependents` once it has at least one to show.
 */
function DependentsList({
  dependents,
}: Readonly<{ dependents: readonly DatasetDependent[] }>): JSX.Element {
  const { t } = useLingui();
  return (
    <>
      <Text size="sm">
        <Trans>These read it and stop working once it is deleted:</Trans>
      </Text>
      <List size="sm">
        {dependents.map(({ key, kind, label }) => {
          return (
            <List.Item key={key}>
              {kind === "linkedDataset"
                ? t`${label} (linked dataset)`
                : label}
            </List.Item>
          );
        })}
      </List>
    </>
  );
}

/**
 * Under a dataset marked for deletion in the uninstall modal, what reads it
 * and stops working once it is deleted. Renders nothing when nothing does and
 * every lookup succeeded. When a lookup failed, it says so instead of
 * reading the missing answer as "nothing reads this".
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
  if (isLoading) {
    return (
      <Loader
        size="xs"
        role="status"
        aria-label={t`Checking what reads this dataset`}
      />
    );
  }
  if (dependents.length === 0 && !hasFailed) {
    return null;
  }
  return (
    <Stack gap="xxs">
      {dependents.length > 0 ? (
        <DependentsList dependents={dependents} />
      ) : null}
      {hasFailed ? (
        <Text size="sm" c="warning.8" role="status">
          <Trans>We could not load what reads this dataset.</Trans>
        </Text>
      ) : null}
    </Stack>
  );
}

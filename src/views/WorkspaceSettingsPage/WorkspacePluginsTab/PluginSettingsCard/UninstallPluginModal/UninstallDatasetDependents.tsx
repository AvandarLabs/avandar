import { Trans, useLingui } from "@lingui/react/macro";
import { List, Loader, Stack, Text } from "@mantine/core";
import { useDatasetDependents } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/useDatasetDependents/useDatasetDependents";
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
                    : t`${label} (data slot)`}
                </List.Item>
              );
            })}
          </List>
        </>
      ) : null}
      {hasFailed ? (
        <Text size="sm" c="warning.8">
          <Trans>We could not check what reads this dataset.</Trans>
        </Text>
      ) : null}
    </Stack>
  );
}

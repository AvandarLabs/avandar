import { useLingui } from "@lingui/react/macro";
import { Button, Group, Text } from "@mantine/core";
import { PluginContentImportStatusText } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/PluginContentImportStatusText";
import { PluginContentDatasetLink } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginContentSection/PluginContentDatasetLink";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { PluginContentImportStatus } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/usePluginContentImports/usePluginContentImports";

type Props = Readonly<{
  /** The item's title, already localized. */
  title: string;

  /** The dataset the item was imported as, if the workspace has it. */
  datasetId: Dataset.Id | undefined;

  /** The item's import progress, if it was imported in this session. */
  status: PluginContentImportStatus | undefined;
  canManage: boolean;
  onImport: () => void;
}>;

/**
 * One content item on a plugin's card: its title, linked to its dataset in
 * Data Sources once imported, else its import progress, and Import or Retry
 * for settings admins. The buttons are named after the item.
 */
export function PluginContentRow({
  title,
  datasetId,
  status,
  canManage,
  onImport,
}: Props): JSX.Element {
  const { t } = useLingui();
  const isFailed = status?.kind === "failed";
  const isRunning = status?.kind === "pending" || status?.kind === "importing";
  if (datasetId !== undefined) {
    return <PluginContentDatasetLink title={title} datasetId={datasetId} />;
  }
  return (
    <Group justify="space-between" wrap="nowrap">
      <Text size="sm">{title}</Text>
      <Group gap="xs" wrap="nowrap" miw={0}>
        {status === undefined ? (
          <Text size="sm" c="dimmed">{t`Not imported`}</Text>
        ) : (
          <PluginContentImportStatusText status={status} />
        )}
        {canManage && !isRunning ? (
          <Button
            size="compact-sm"
            flex="none"
            variant="default"
            aria-label={isFailed ? t`Retry ${title}` : t`Import ${title}`}
            onClick={onImport}
          >
            {isFailed ? t`Retry` : t`Import`}
          </Button>
        ) : null}
      </Group>
    </Group>
  );
}

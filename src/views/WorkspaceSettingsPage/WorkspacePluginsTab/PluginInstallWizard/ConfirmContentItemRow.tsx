import { useLingui } from "@lingui/react/macro";
import { Button, Group, Text } from "@mantine/core";
import { PluginContentImportStatusText } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/PluginContentImportStatusText";
import type { PluginContentImportStatus } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/usePluginContentImports/usePluginContentImports";

type Props = Readonly<{
  /** The item's title, already localized. */
  title: string;

  /** Undefined until the install starts the item's import. */
  status: PluginContentImportStatus | undefined;
  onRetry: () => void;
}>;

/**
 * One dataset in the Confirm step's list: its title, its import progress,
 * and Retry once it failed. Retry is named after the dataset, so each one is
 * told apart by a screen reader.
 */
export function ConfirmContentItemRow({
  title,
  status,
  onRetry,
}: Props): JSX.Element {
  const { t } = useLingui();
  return (
    <Group justify="space-between" wrap="nowrap">
      <Text size="sm">{title}</Text>
      <Group gap="xs" wrap="nowrap" miw={0}>
        {status === undefined ? null : (
          <PluginContentImportStatusText status={status} />
        )}
        {status?.kind === "failed" ? (
          <Button
            size="compact-sm"
            flex="none"
            variant="default"
            aria-label={t`Retry ${title}`}
            onClick={onRetry}
          >
            {t`Retry`}
          </Button>
        ) : null}
      </Group>
    </Group>
  );
}

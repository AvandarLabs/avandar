import { useLingui } from "@lingui/react/macro";
import { Group, Loader, Text } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import { match } from "ts-pattern";
import type { PluginContentImportStatus } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/usePluginContentImports/usePluginContentImports";

type Props = Readonly<{ status: PluginContentImportStatus }>;

/**
 * One content item's import progress in words, with a spinner while it runs
 * and the reason when it failed. Shown next to each item being imported,
 * for example in the install wizard's summary or on a plugin's card.
 */
export function PluginContentImportStatusText({ status }: Props): JSX.Element {
  const { t } = useLingui();
  return match(status)
    .with({ kind: "pending" }, () => {
      return (
        <Text size="sm" c="dimmed">
          {t`Waiting`}
        </Text>
      );
    })
    .with({ kind: "importing" }, () => {
      return (
        <Group gap="xxs" wrap="nowrap">
          <Loader size="xs" aria-hidden />
          <Text size="sm">{t`Importing`}</Text>
        </Group>
      );
    })
    .with({ kind: "done" }, () => {
      return (
        <Group gap="xxs" wrap="nowrap">
          <IconCheck size={16} aria-hidden />
          <Text size="sm">{t`Imported`}</Text>
        </Group>
      );
    })
    .with({ kind: "failed" }, ({ reason }) => {
      return <Text size="sm" c="danger">{t`Failed: ${reason}`}</Text>;
    })
    .exhaustive();
}

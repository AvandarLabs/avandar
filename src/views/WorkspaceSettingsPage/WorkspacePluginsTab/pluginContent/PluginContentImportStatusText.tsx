import { useLingui } from "@lingui/react/macro";
import { Box, Group, Loader, Text } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import { match } from "ts-pattern";
import { UntranslatedDetail } from "@/components/UntranslatedDetail/UntranslatedDetail";
import css from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/PluginContentImportStatusText.module.css";
import type { PluginContentImportStatus } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/usePluginContentImports/usePluginContentImports";

type Props = Readonly<{ status: PluginContentImportStatus }>;

/**
 * One content item's import progress in words, with a spinner while it runs
 * and the reason when it failed. Shown next to each item being imported,
 * for example in the install wizard's summary or on a plugin's card. A long
 * reason wraps inside its container instead of widening the row.
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
      return (
        <Box miw={0} className={css.failedStatus}>
          <Text size="sm" c="danger">
            {t`Failed`}
          </Text>
          <UntranslatedDetail detail={reason} />
        </Box>
      );
    })
    .exhaustive();
}

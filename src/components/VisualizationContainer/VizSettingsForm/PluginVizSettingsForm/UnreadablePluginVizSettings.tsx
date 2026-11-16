import { Callout } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import { Button, Group } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import type { ReactNode } from "react";

type Props = Readonly<{
  /** Replaces the stored settings with the chart type's defaults. */
  onReset: () => void;
}>;

/**
 * What `PluginVizSettingsForm` shows in place of its controls when a plugin
 * chart's stored settings cannot be read, so a broken config never crashes
 * the settings panel and the user can start over from the defaults.
 */
export function UnreadablePluginVizSettings({ onReset }: Props): ReactNode {
  const { t } = useLingui();
  return (
    <Callout
      color="warning"
      icon={<IconAlertTriangle size={20} aria-hidden />}
      message={t`These chart settings can't be read.`}
      messageSize="sm"
    >
      <Group>
        <Button size="xs" variant="light" color="warning" onClick={onReset}>
          <Trans>Reset chart settings</Trans>
        </Button>
      </Group>
    </Callout>
  );
}

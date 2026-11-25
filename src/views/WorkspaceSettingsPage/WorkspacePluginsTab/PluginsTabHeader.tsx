import { Trans } from "@lingui/react/macro";
import { Text, Title } from "@mantine/core";

type Props = Readonly<{ canManage: boolean }>;

/**
 * The Plugins tab's title and what plugins do. Users who cannot manage
 * plugins also read why every action below is disabled.
 */
export function PluginsTabHeader({ canManage }: Props): JSX.Element {
  return (
    <div>
      <Title order={4}>
        <Trans>Plugins</Trans>
      </Title>
      <Text c="dimmed" mt={4}>
        <Trans>
          Plugins add features to this workspace. Installing or removing a
          plugin affects every member.
        </Trans>
      </Text>
      {canManage ? null : (
        <Text size="sm" c="dimmed" mt="xs">
          <Trans>
            You do not have permission to manage plugins. Ask a workspace admin
            to make changes.
          </Trans>
        </Text>
      )}
    </div>
  );
}

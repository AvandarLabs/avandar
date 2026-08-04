import { Trans } from "@lingui/react/macro";
import { Button, Group, Stack, Text } from "@mantine/core";

type Props = {
  onChangePassword: () => void;
};

/** Displays the password row and opens the password-change flow. */
export function PasswordSection({ onChangePassword }: Props): JSX.Element {
  return (
    <Stack gap="xs">
      <Stack gap={2}>
        <Text fw={600}>
          <Trans>Password</Trans>
        </Text>
        <Text c="dimmed" size="sm">
          <Trans>You'll be asked to confirm your current password.</Trans>
        </Text>
      </Stack>
      <Group justify="space-between" wrap="nowrap">
        <Text size="sm" c="dimmed" ff="monospace">
          ••••••••••
        </Text>
        <Button variant="default" onClick={onChangePassword}>
          <Trans>Change password</Trans>
        </Button>
      </Group>
    </Stack>
  );
}

import { Trans } from "@lingui/react/macro";
import { Button, Group } from "@mantine/core";
import { BackToLoginLink } from "@/components/layouts/AuthLayout/BackToLoginLink";
import type { ReactElement } from "react";

type Props = {
  isOnline: boolean;
  isRegistrationPending: boolean;
  isRegistrationSuccess: boolean;
};

/** Renders navigation and submission controls for registration. */
export function RegistrationActions({
  isOnline,
  isRegistrationPending,
  isRegistrationSuccess,
}: Readonly<Props>): ReactElement {
  return (
    <Group justify="space-between" gap="xl" mt="md">
      <BackToLoginLink />
      <Button
        flex={1}
        loading={isRegistrationPending}
        type="submit"
        disabled={isRegistrationPending || isRegistrationSuccess || !isOnline}
      >
        <Trans>Register</Trans>
      </Button>
    </Group>
  );
}

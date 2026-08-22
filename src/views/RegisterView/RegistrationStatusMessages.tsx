import type { ReactElement } from "react";

import { Trans } from "@lingui/react/macro";
import { Alert, Text } from "@mantine/core";

type Props = {
  isOnline: boolean;
  isRegistrationSuccess: boolean;
};

/** Renders connectivity and successful-submission registration messages. */
export function RegistrationStatusMessages({
  isOnline,
  isRegistrationSuccess,
}: Readonly<Props>): ReactElement {
  return (
    <>
      {!isOnline ? (
        <Alert color="yellow" variant="light">
          <Trans>Registration requires an internet connection.</Trans>
        </Alert>
      ) : null}
      {isRegistrationSuccess ? (
        <Text mt="lg" c="green">
          <Trans>
            Please check your email for a confirmation link. It may take a few
            minutes to arrive.
          </Trans>
        </Text>
      ) : null}
    </>
  );
}

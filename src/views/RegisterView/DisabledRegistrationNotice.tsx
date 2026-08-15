import { Trans } from "@lingui/react/macro";
import { Anchor, Divider, Stack, Text, Title } from "@mantine/core";
import { INFO_EMAIL } from "$/config/GlobalAppConfig";
import type { ReactElement } from "react";

/** Explains why self-registration is unavailable and offers a contact path. */
export function DisabledRegistrationNotice(): ReactElement {
  return (
    <Stack>
      <Title order={2}>
        <Trans>Thank you for your interest!</Trans>
      </Title>
      <Text>
        <Trans>
          However, we are not allowing new registrations at the moment.
        </Trans>
      </Text>
      <Text>
        <Trans>
          Please{" "}
          <Anchor
            href={`mailto:${INFO_EMAIL}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            email us
          </Anchor>{" "}
          if you would like access.
        </Trans>
      </Text>
      <Divider mb="sm" />
    </Stack>
  );
}

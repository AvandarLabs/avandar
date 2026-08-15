import { Trans } from "@lingui/react/macro";
import { Alert, Code, Stack, Text } from "@mantine/core";
import { IconInfoCircle, IconWorld } from "@tabler/icons-react";
import css from "./PublishDashboardStatus.module.css";
import type { ReactNode } from "react";

type Props = {
  isAlreadyPublished: boolean;
  isUsingVanity: boolean;
  targetUrl: string;
};

/** Explains dashboard visibility and previews its public URL. */
export function PublishDashboardStatus({
  isAlreadyPublished,
  isUsingVanity,
  targetUrl,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {isAlreadyPublished ?
        <Alert color="teal" icon={<IconWorld size={18} />} variant="light">
          <Text size="sm">
            <Trans>
              This dashboard is <strong>public</strong>. Anyone with the link
              below can view it.
            </Trans>
          </Text>
        </Alert>
      : <Alert color="blue" icon={<IconInfoCircle size={18} />} variant="light">
          <Text size="sm">
            <Trans>
              Publishing makes this dashboard viewable by anyone with the link,
              no Avandar account required.
            </Trans>
          </Text>
        </Alert>
      }
      <Stack gap={6}>
        <Text size="sm" fw={500}>
          {isAlreadyPublished ?
            <Trans>Your dashboard is published at:</Trans>
          : <Trans>Your dashboard will be published to:</Trans>}
        </Text>
        <Code block className={css.publishDashboardStatusTargetUrl}>
          {targetUrl}
        </Code>
        <Text size="xs" c="dimmed">
          {isUsingVanity ?
            <Trans>
              Using your custom URL. The permanent UUID link below also still
              works.
            </Trans>
          : <Trans>
              By default we use a permanent UUID-based link. Add a custom path
              below for a nicer URL.
            </Trans>
          }
        </Text>
      </Stack>
    </>
  );
}

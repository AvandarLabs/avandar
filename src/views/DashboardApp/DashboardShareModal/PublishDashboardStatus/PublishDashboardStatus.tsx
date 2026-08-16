import { Trans } from "@lingui/react/macro";
import { Code, Stack, Text } from "@mantine/core";
import { DivergenceAlert } from "./DivergenceAlert";
import css from "./PublishDashboardStatus.module.css";
import { VisibilityAlert } from "./VisibilityAlert";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { ReactNode } from "react";

type Props = {
  visibility: Dashboard.Visibility;
  targetVisibility: Dashboard.Visibility;
  isUsingVanity: boolean;
  targetUrl: string;
};

/**
 * Explains dashboard visibility and previews the URL for the chosen audience.
 *
 * The second alert exists because share writes land immediately while the
 * published snapshot only moves when the footer button is pressed. Without it,
 * a user who picked a new audience would see no sign that the published copy
 * still serves the old one.
 */
export function PublishDashboardStatus({
  visibility,
  targetVisibility,
  isUsingVanity,
  targetUrl,
}: Readonly<Props>): ReactNode {
  const isAlreadyPublished = visibility !== "draft";
  return (
    <>
      <VisibilityAlert visibility={visibility} />
      {targetVisibility !== visibility ?
        <DivergenceAlert visibility={visibility} />
      : null}
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
              Using your custom URL. The direct UUID link below also still
              works.
            </Trans>
          : <Trans>
              By default we use a direct UUID-based link. Add a custom path
              below for a nicer URL.
            </Trans>
          }
        </Text>
      </Stack>
    </>
  );
}

import { matchLiteral } from "@avandar/utils";
import { Trans } from "@lingui/react/macro";
import { Alert, Code, Stack, Text } from "@mantine/core";
import { IconBuilding, IconInfoCircle, IconWorld } from "@tabler/icons-react";
import css from "./PublishDashboardStatus.module.css";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { ReactNode } from "react";

type Props = {
  visibility: Dashboard.Visibility;
  targetVisibility: Dashboard.Visibility;
  isUsingVanity: boolean;
  targetUrl: string;
};

/**
 * The alert shown when the picked audience has not reached the published copy.
 *
 * It branches on the PERSISTED visibility because the three cases are three
 * different facts. A draft has no published copy to be stale, so claiming one
 * would contradict the "Not published yet" alert directly above it. A public
 * dashboard being narrowed is the dangerous case: the dropdown already reads
 * "Restricted" while `is_public` is still true and the anon policy still
 * serves the whole internet, so this alert has to name that exposure in red
 * rather than describe a tidy pending change.
 *
 * Neither case claims the access change "is saved": selecting "Anyone with the
 * link" deliberately writes nothing at all.
 */
function _renderDivergenceAlert(visibility: Dashboard.Visibility): ReactNode {
  if (visibility === "public") {
    return (
      <Alert color="red" icon={<IconWorld size={18} />} variant="light">
        <Text size="sm">
          <Trans>
            This dashboard is still public on the web. Anyone with the link can
            view it until you press the button below.
          </Trans>
        </Text>
      </Alert>
    );
  }
  return (
    <Alert color="yellow" icon={<IconInfoCircle size={18} />} variant="light">
      <Text size="sm">
        {visibility === "draft" ?
          <Trans>
            This dashboard is not published yet. Use the button below to publish
            it to the audience you picked.
          </Trans>
        : <Trans>
            The published copy still serves the previous audience. Use the
            button below to apply your change.
          </Trans>
        }
      </Text>
    </Alert>
  );
}

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
      {matchLiteral(visibility, {
        draft: () => {
          return (
            <Alert
              color="blue"
              icon={<IconInfoCircle size={18} />}
              variant="light"
            >
              <Text size="sm">
                <Trans>
                  Not published yet. Nobody can open this dashboard from a link
                  until you publish it.
                </Trans>
              </Text>
            </Alert>
          );
        },
        workspace: () => {
          return (
            <Alert
              color="teal"
              icon={<IconBuilding size={18} />}
              variant="light"
            >
              <Text size="sm">
                <Trans>
                  This dashboard is published to your workspace. Only people you
                  have given access can open the link below.
                </Trans>
              </Text>
            </Alert>
          );
        },
        public: () => {
          return (
            <Alert
              color="orange"
              icon={<IconWorld size={18} />}
              variant="light"
            >
              <Text size="sm">
                <Trans>
                  This dashboard is <strong>public</strong>. Anyone with the
                  link can view it, with no Avandar account.
                </Trans>
              </Text>
            </Alert>
          );
        },
      })}
      {targetVisibility !== visibility ?
        _renderDivergenceAlert(visibility)
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

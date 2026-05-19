import {
  Alert,
  Anchor,
  Badge,
  Button,
  Code,
  Divider,
  Group,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconInfoCircle, IconWorld } from "@tabler/icons-react";
import { notifyError, notifySuccess } from "@ui";
import { useMemo, useState } from "react";
import { DashboardClient } from "@/clients/dashboards/DashboardClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { buildShareUrls } from "@/views/DashboardApp/DashboardEditorView/PublishDashboardModal/buildShareUrls";
import { ShareUrlRow } from "@/views/DashboardApp/DashboardEditorView/PublishDashboardModal/ShareUrlRow";
import { toVanitySlug } from "@/views/DashboardApp/DashboardEditorView/PublishDashboardModal/slug";
import type { Dashboard } from "$/models/Dashboard/Dashboard";

type Props = {
  dashboard: Dashboard.T;
  onClose: () => void;
};

/**
 * Drives the publish-or-update-share flow. Three logical states:
 *
 *   1) Not yet published — show the form (vanity URL field, publish button).
 *      After successful publish, transition to state 3.
 *   2) Already published, no vanity slug — show the canonical share URL +
 *      lets the user optionally add a vanity URL via the form.
 *   3) Already published with a vanity slug — show both URLs.
 *
 * Vanity URLs go to `/d/<workspaceSlug>/<slug>`; the canonical
 * dashboardId URL at `/public/dashboards/<workspaceSlug>/<dashboardId>`
 * is always available and is what the QR code falls back to.
 */
export function PublishDashboardModal({
  dashboard,
  onClose,
}: Props): JSX.Element {
  const workspace = useCurrentWorkspace();
  const [publishDashboard, isPublishing] = DashboardClient.usePublishDashboard({
    onSuccess: () => {
      notifySuccess(
        dashboard.isPublic ?
          "Dashboard share settings updated."
        : "Dashboard published!",
      );
    },
    onError: (e: Error) => {
      notifyError({
        title: "Could not publish dashboard",
        message: e.message,
      });
    },
  });

  const [slugInput, setSlugInput] = useState(dashboard.slug ?? "");
  const normalisedSlug = useMemo(() => {
    return toVanitySlug(slugInput);
  }, [slugInput]);

  const shareUrls = buildShareUrls({
    workspaceSlug: workspace.slug,
    dashboardId: dashboard.id,
    slug: dashboard.slug,
  });
  // Live preview of what the vanity URL would be _after_ submitting the
  // form. Used as the share row when the dashboard already has a slug.
  const previewVanityUrl =
    normalisedSlug ?
      buildShareUrls({
        workspaceSlug: workspace.slug,
        dashboardId: dashboard.id,
        slug: normalisedSlug,
      }).vanity
    : undefined;

  const isAlreadyPublished = dashboard.isPublic;

  const submit = (): void => {
    publishDashboard({
      dashboardId: dashboard.id,
      ...(normalisedSlug ? { slug: normalisedSlug } : {}),
    });
  };

  return (
    <Stack gap="md">
      {isAlreadyPublished ?
        <Alert color="teal" icon={<IconWorld size={18} />} variant="light">
          <Text size="sm">
            This dashboard is <strong>public</strong>. Anyone with the link
            below can view it.
          </Text>
        </Alert>
      : <Alert color="blue" icon={<IconInfoCircle size={18} />} variant="light">
          <Text size="sm">
            Publishing makes this dashboard viewable by anyone with the link
            — no Avandar account required. Datasets referenced by the
            dashboard are copied to public storage at publish time.
          </Text>
        </Alert>
      }

      <Stack gap={4}>
        <Title order={5}>Vanity URL</Title>
        <Text size="xs" c="dimmed">
          Optional. A short, memorable URL for flyers, reports, and QR
          codes. Leave blank to publish without one — you'll still get a
          shareable link.
        </Text>
        <TextInput
          label="Custom path"
          description="Lowercase letters, numbers, and underscores. We'll auto-format what you type."
          placeholder="my_cholera_report"
          value={slugInput}
          onChange={(e) => {
            return setSlugInput(e.currentTarget.value);
          }}
          rightSection={
            normalisedSlug ?
              <Badge size="sm" variant="light" color="blue" mr="sm">
                {normalisedSlug}
              </Badge>
            : null
          }
          rightSectionWidth={150}
        />
        {normalisedSlug && previewVanityUrl ?
          <Text size="xs" c="dimmed">
            URL preview: <Code>{previewVanityUrl}</Code>
          </Text>
        : null}
      </Stack>

      <Divider />

      {isAlreadyPublished ?
        <Stack gap="md">
          <Title order={5}>Share</Title>
          {shareUrls.vanity ?
            <ShareUrlRow
              label="Vanity URL"
              url={shareUrls.vanity}
              hint="Best for flyers, QR codes, and word-of-mouth sharing."
            />
          : null}
          <ShareUrlRow
            label={
              shareUrls.vanity ? "Permanent link (always works)" : (
                "Share link"
              )
            }
            url={shareUrls.canonical}
            hint={
              shareUrls.vanity ?
                "Falls back to this if the vanity URL ever changes."
              : "Anyone with this link can view the dashboard."
            }
          />
        </Stack>
      : null}

      <Group justify="space-between" mt="md">
        <Anchor size="xs" c="dimmed" onClick={onClose} component="button">
          Close
        </Anchor>
        <Group gap="xs">
          <Button variant="subtle" color="neutral" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={isPublishing}
            onClick={submit}
            leftSection={<IconWorld size={16} />}
          >
            {isAlreadyPublished ?
              normalisedSlug && normalisedSlug !== dashboard.slug ?
                "Update vanity URL"
              : "Already published"
            : "Publish"}
          </Button>
        </Group>
      </Group>
    </Stack>
  );
}

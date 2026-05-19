import {
  Alert,
  Anchor,
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
 * Drives the publish-or-update-share flow.
 *
 * Pre-publish: lead with the URL the dashboard will be published to
 * (the canonical UUID URL by default; updates live as the user types a
 * custom slug). On publish, show the same URL with copy + QR
 * affordances. The user can come back later and add or change a
 * vanity slug via the same modal.
 *
 * Vanity URLs go to `/d/<workspaceSlug>/<slug>`; the canonical
 * dashboardId URL at `/public/dashboards/<workspaceSlug>/<dashboardId>`
 * is always available, so even if someone changes the vanity slug the
 * canonical URL keeps working.
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

  // The URL the dashboard will be (or has been) published to. Prefers
  // the live vanity preview when the user has typed something; falls
  // back to the canonical UUID URL otherwise.
  const livePreviewUrls = buildShareUrls({
    workspaceSlug: workspace.slug,
    dashboardId: dashboard.id,
    slug: normalisedSlug || dashboard.slug,
  });
  const targetUrl = livePreviewUrls.vanity ?? livePreviewUrls.canonical;
  const isUsingVanity = Boolean(livePreviewUrls.vanity);

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
            Publishing makes this dashboard viewable by anyone with the link —
            no Avandar account required. Datasets referenced by the dashboard
            are copied to public storage at publish time.
          </Text>
        </Alert>
      }

      <Stack gap={6}>
        <Text size="sm" fw={500}>
          {isAlreadyPublished ?
            "Your dashboard is published at:"
          : "Your dashboard will be published to:"}
        </Text>
        <Code
          block
          style={{
            wordBreak: "break-all",
            fontSize: "0.9em",
            padding: "8px 12px",
          }}
        >
          {targetUrl}
        </Code>
        <Text size="xs" c="dimmed">
          {isUsingVanity ?
            "Using your custom URL. The permanent UUID link below also still works."
          : "By default we use a permanent UUID-based link. Add a custom path below for a nicer URL."}
        </Text>
      </Stack>

      <Divider />

      <Stack gap={4}>
        <Title order={5} fw={600}>
          Custom URL (optional)
        </Title>
        <Text size="xs" c="dimmed">
          A short, memorable URL for flyers, reports, and QR codes. Whatever
          you type is kebab-cased automatically.
        </Text>
        <TextInput
          aria-label="Custom URL path"
          placeholder="e.g. cholera-outbreak-2024"
          value={slugInput}
          onChange={(e) => {
            return setSlugInput(e.currentTarget.value);
          }}
          rightSection={
            normalisedSlug ?
              <Code
                style={{
                  fontSize: "0.78em",
                  padding: "1px 6px",
                  marginRight: 8,
                  whiteSpace: "nowrap",
                }}
              >
                {normalisedSlug}
              </Code>
            : null
          }
          rightSectionWidth={160}
        />
      </Stack>

      {isAlreadyPublished ?
        <>
          <Divider />
          <Stack gap="md">
            <Title order={5} fw={600}>
              Share
            </Title>
            {livePreviewUrls.vanity ?
              <ShareUrlRow
                label="Custom URL"
                url={livePreviewUrls.vanity}
                hint="Best for flyers, QR codes, and word-of-mouth sharing."
              />
            : null}
            <ShareUrlRow
              label={
                livePreviewUrls.vanity ?
                  "Permanent link (always works)"
                : "Share link"
              }
              url={livePreviewUrls.canonical}
              hint={
                livePreviewUrls.vanity ?
                  "Falls back to this if the custom URL ever changes."
                : "Anyone with this link can view the dashboard."
              }
            />
          </Stack>
        </>
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
                "Update custom URL"
              : "Already published"
            : "Publish"}
          </Button>
        </Group>
      </Group>
    </Stack>
  );
}

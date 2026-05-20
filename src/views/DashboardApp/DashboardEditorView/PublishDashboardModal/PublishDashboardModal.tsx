import { Trans, useLingui } from "@lingui/react/macro";
import {
  Alert,
  Anchor,
  Button,
  Code,
  Divider,
  Group,
  Loader,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconCheck, IconInfoCircle, IconWorld } from "@tabler/icons-react";
import { notifyError, notifySuccess } from "@ui";
import { useEffect, useMemo, useState } from "react";
import { DashboardClient } from "@/clients/dashboards/DashboardClient";
import { readDashboardPublishConfig } from "@/clients/dashboards/sliceBuilder";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { logAnalyticsEvent } from "@/lib/analytics/analyticsClient";
import { buildShareUrls } from "@/views/DashboardApp/DashboardEditorView/PublishDashboardModal/buildShareUrls";
import { PublishSliceSection } from "@/views/DashboardApp/DashboardEditorView/PublishDashboardModal/PublishSliceSection";
import { ShareUrlRow } from "@/views/DashboardApp/DashboardEditorView/PublishDashboardModal/ShareUrlRow";
import { toVanitySlug } from "@/views/DashboardApp/DashboardEditorView/PublishDashboardModal/slug";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { DashboardPublishConfig } from "$/models/Dashboard/PublishSliceConfig";

const SLUG_VALIDATION_DEBOUNCE_MS = 500;

type SlugValidationResult =
  | { isValid: true }
  | { isValid: false; reason: string };

type Props = {
  dashboard: Dashboard.T;
  onClose: () => void;
  /**
   * Optional id of the Mantine modal hosting this component. When
   * provided, the modal's title is updated via `modals.updateModal` on
   * publish success so the header flips from "Publish dashboard" to
   * "Manage sharing" without a remount.
   */
  modalId?: string;
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
 * Vanity URLs go to `/d/<slug>` and slugs are globally unique among
 * public dashboards; the canonical dashboardId URL at
 * `/public/dashboards/<workspaceSlug>/<dashboardId>` is always
 * available, so even if someone changes the vanity slug the canonical
 * URL keeps working (it redirects to the slug URL when one is set).
 */
export function PublishDashboardModal({
  dashboard,
  onClose,
  modalId,
}: Props): JSX.Element {
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  // Track the live dashboard locally so a successful publish flips the
  // UI to the "already published" branch (with share URLs and QR) without
  // waiting for the parent to refetch. The mutation returns the updated
  // row; we mirror it here.
  const [currentDashboard, setCurrentDashboard] =
    useState<Dashboard.T>(dashboard);
  const [publishDashboard, isPublishing] = DashboardClient.usePublishDashboard({
    onSuccess: (updatedDashboard) => {
      notifySuccess(
        currentDashboard.isPublic ?
          t`Dashboard share settings updated.`
        : t`Dashboard published!`,
      );
      void logAnalyticsEvent({
        event: "dashboard.published",
        workspaceId: updatedDashboard.workspaceId,
        app: "dashboards",
        payload: {
          dashboardId: updatedDashboard.id,
          wasPreviouslyPublic: currentDashboard.isPublic,
        },
      });
      setCurrentDashboard(updatedDashboard);
      // Sync the input to whatever ended up persisted (e.g. cleared
      // when the user blanked the slug). The modal's title is owned by
      // the Mantine modal stack, so we use the modals API to flip it.
      setSlugInput(updatedDashboard.slug ?? "");
      if (modalId) {
        modals.updateModal({
          modalId,
          title: t`Manage sharing`,
        });
      }
    },
    onError: (e: Error) => {
      notifyError({
        title: t`Could not publish dashboard`,
        message: e.message,
      });
    },
  });

  const [slugInput, setSlugInput] = useState(currentDashboard.slug ?? "");
  const normalisedSlug = useMemo(() => {
    return toVanitySlug(slugInput);
  }, [slugInput]);

  // Slug availability check. Debounced; tracks the last slug we got a
  // result for so a slow response for an older slug can't overwrite a
  // newer result. An empty `normalisedSlug` means "no vanity URL" and
  // bypasses validation entirely (the dashboardId URL is always valid).
  const [validateSlug, isValidatingSlug] =
    DashboardClient.useValidateDashboardSlug({
      onSuccess: (result, variables) => {
        setSlugValidationResult(result);
        setLastValidatedSlug(variables.slug);
      },
    });
  const [slugValidationResult, setSlugValidationResult] = useState<
    SlugValidationResult | undefined
  >(undefined);
  const [lastValidatedSlug, setLastValidatedSlug] = useState<
    string | undefined
  >(undefined);

  useEffect(() => {
    if (!normalisedSlug) {
      // Clear any prior result so the row doesn't render a stale state
      // when the user empties the input.
      setSlugValidationResult(undefined);
      setLastValidatedSlug(undefined);
      return;
    }
    const handle = window.setTimeout(() => {
      validateSlug({
        slug: normalisedSlug,
        dashboardId: currentDashboard.id,
      });
    }, SLUG_VALIDATION_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(handle);
    };
  }, [normalisedSlug, currentDashboard.id, validateSlug]);

  const hasPendingSlugCheck =
    !!normalisedSlug &&
    (isValidatingSlug || lastValidatedSlug !== normalisedSlug);
  const isSlugRejected =
    !!normalisedSlug &&
    lastValidatedSlug === normalisedSlug &&
    slugValidationResult?.isValid === false;
  const isSlugAccepted =
    !!normalisedSlug &&
    lastValidatedSlug === normalisedSlug &&
    slugValidationResult?.isValid === true;
  const slugErrorMessage =
    isSlugRejected && slugValidationResult?.isValid === false ?
      slugValidationResult.reason
    : undefined;

  const [publishConfig, setPublishConfig] = useState<DashboardPublishConfig>(
    () => {
      return readDashboardPublishConfig(currentDashboard.config);
    },
  );

  // The URL the dashboard will be (or has been) published to. Prefers
  // the live vanity preview when the user has typed something; falls
  // back to the canonical UUID URL otherwise.
  const livePreviewUrls = buildShareUrls({
    workspaceSlug: workspace.slug,
    dashboardId: currentDashboard.id,
    slug: normalisedSlug || currentDashboard.slug,
  });
  const targetUrl = livePreviewUrls.vanity ?? livePreviewUrls.canonical;
  const isUsingVanity = Boolean(livePreviewUrls.vanity);

  const isAlreadyPublished = currentDashboard.isPublic;

  const submit = (): void => {
    // Don't let a stale debounced check or pending request leak through.
    if (normalisedSlug && (hasPendingSlugCheck || isSlugRejected)) {
      return;
    }
    // `normalisedSlug` non-empty: set/update the slug.
    // `normalisedSlug` empty + dashboard previously had one: clear it.
    // `normalisedSlug` empty + dashboard had none: omit (no-op for the field).
    const slugParam: string | null | undefined =
      normalisedSlug ? normalisedSlug
      : currentDashboard.slug ? null
      : undefined;
    publishDashboard({
      dashboardId: currentDashboard.id,
      ...(slugParam !== undefined ? { slug: slugParam } : {}),
      publishConfig,
    });
  };

  return (
    <Stack gap="md">
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
              Publishing makes this dashboard viewable by anyone with the link
              — no Avandar account required. Datasets referenced by the
              dashboard are copied to public storage at publish time.
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

      <Divider />

      <Stack gap={4}>
        <Title order={5} fw={600}>
          <Trans>Custom URL (optional)</Trans>
        </Title>
        <Text size="xs" c="dimmed">
          <Trans>
            A short, memorable URL for flyers, reports, and QR codes. Whatever
            you type is kebab-cased automatically.
          </Trans>
        </Text>
        <TextInput
          aria-label={t`Custom URL path`}
          placeholder={t`e.g. cholera-outbreak-2024`}
          value={slugInput}
          onChange={(e) => {
            return setSlugInput(e.currentTarget.value);
          }}
          error={slugErrorMessage}
          rightSection={
            !normalisedSlug ? null
            : hasPendingSlugCheck ?
              <Loader size="xs" />
            : isSlugAccepted ?
              <IconCheck
                size={18}
                color="var(--mantine-color-teal-6)"
                aria-label={t`Custom URL is available`}
              />
            : null
          }
          rightSectionWidth={36}
        />
        {normalisedSlug ?
          <Group gap={6} mt={2} wrap="nowrap">
            <Text size="xs" c="dimmed">
              <Trans>Preview:</Trans>
            </Text>
            <Code style={{ fontSize: "0.78em", padding: "1px 6px" }}>
              /d/{normalisedSlug}
            </Code>
          </Group>
        : null}
      </Stack>

      <Divider />

      <PublishSliceSection
        dashboard={currentDashboard}
        publishConfig={publishConfig}
        onChange={setPublishConfig}
      />

      {isAlreadyPublished ?
        <>
          <Divider />
          <Stack gap="md">
            <Title order={5} fw={600}>
              <Trans>Share</Trans>
            </Title>
            {livePreviewUrls.vanity ?
              <ShareUrlRow
                label={t`Custom URL`}
                url={livePreviewUrls.vanity}
                hint={t`Best for word-of-mouth sharing. Visiting the permanent link below also redirects here.`}
                showQr={false}
              />
            : null}
            <ShareUrlRow
              label={
                livePreviewUrls.vanity ?
                  t`Permanent link (use for QR codes)`
                : t`Share link`
              }
              url={livePreviewUrls.canonical}
              hint={
                livePreviewUrls.vanity ?
                  t`Never changes, so QR codes printed from here keep working even if the custom URL changes.`
                : t`Anyone with this link can view the dashboard.`
              }
            />
          </Stack>
        </>
      : null}

      <Group justify="space-between" mt="md">
        <Anchor size="xs" c="dimmed" onClick={onClose} component="button">
          <Trans>Close</Trans>
        </Anchor>
        <Group gap="xs">
          <Button variant="subtle" color="neutral" onClick={onClose}>
            <Trans>Cancel</Trans>
          </Button>
          <Button
            loading={isPublishing}
            disabled={hasPendingSlugCheck || isSlugRejected}
            onClick={submit}
            leftSection={<IconWorld size={16} />}
          >
            {isAlreadyPublished ?
              <Trans>Update &amp; republish</Trans>
            : <Trans>Publish</Trans>}
          </Button>
        </Group>
      </Group>
    </Stack>
  );
}

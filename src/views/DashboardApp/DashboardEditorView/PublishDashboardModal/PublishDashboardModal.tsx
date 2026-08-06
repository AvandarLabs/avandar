import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { modals } from "@mantine/modals";
import { notifyError, notifySuccess } from "@ui";
import { matchLiteral } from "@utils";
import { useEffect, useState } from "react";
import { DashboardClient } from "@/clients/dashboards/DashboardClient";
import { DashboardSliceBuilder } from "@/clients/dashboards/DashboardSliceBuilder/DashboardSliceBuilder";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { AnalyticsClient } from "@/lib/analytics/AnalyticsClient";
import { PublishSliceConfig } from "@/models/Dashboard/PublishSliceConfig/PublishSliceConfig";
import { buildShareUrls } from "@/views/DashboardApp/DashboardEditorView/PublishDashboardModal/buildShareUrls";
import { PublishDashboardModalContent } from "@/views/DashboardApp/DashboardEditorView/PublishDashboardModal/PublishDashboardModalContent";
import { toVanitySlug } from "@/views/DashboardApp/DashboardEditorView/PublishDashboardModal/toVanitySlug/toVanitySlug";
import type { I18n } from "@lingui/core";
import type { DashboardSlugValidationFailure } from "@sbfn/dashboards/DashboardsRoutes/DashboardsRoutes.types";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { ReactNode } from "react";

const SLUG_VALIDATION_DEBOUNCE_MS = 500;

type SlugValidationResult = { isValid: true } | DashboardSlugValidationFailure;

function _slugFailureToMessage(
  failure: DashboardSlugValidationFailure,
  i18n: I18n,
): string {
  return matchLiteral(failure.reason, {
    empty: i18n._(msg`The custom URL cannot be empty`),
    spaces: i18n._(msg`The custom URL cannot contain spaces`),
    invalid_characters: i18n._(
      msg`The custom URL can only contain lowercase letters, numbers, and hyphens`,
    ),
    too_short: i18n._(
      msg`The custom URL must be at least ${failure.limit ?? 3} characters`,
    ),
    too_long: i18n._(
      msg`The custom URL cannot exceed ${failure.limit ?? 64} characters`,
    ),
    taken: i18n._(msg`This custom URL is already taken`),
  });
}

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
}: Props): ReactNode {
  const { t, i18n } = useLingui();
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
      void AnalyticsClient.logEvent({
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
    onError: (error: Error) => {
      console.error(error);
      notifyError({
        title: t`Could not publish dashboard`,
        message: t`Please try again. Your dashboard has not been published.`,
      });
    },
  });

  const [slugInput, setSlugInput] = useState(currentDashboard.slug ?? "");
  const normalisedSlug = toVanitySlug(slugInput);

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

  useEffect(
    function validateNormalisedSlug() {
      if (!normalisedSlug) {
        // Clear any prior result so the row doesn't render a stale state
        // when the user empties the input.
        setSlugValidationResult(undefined);
        setLastValidatedSlug(undefined);
        return;
      }
      const timeoutId = window.setTimeout(() => {
        validateSlug({
          slug: normalisedSlug,
          dashboardId: currentDashboard.id,
        });
      }, SLUG_VALIDATION_DEBOUNCE_MS);
      return () => {
        window.clearTimeout(timeoutId);
      };
    },
    [normalisedSlug, currentDashboard.id, validateSlug],
  );

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
      _slugFailureToMessage(slugValidationResult, i18n)
    : undefined;

  const [publishConfig, setPublishConfig] =
    useState<PublishSliceConfig.Dashboard>(() => {
      return DashboardSliceBuilder.readDashboardPublishConfig(
        currentDashboard.config,
      );
    });

  // The URL the dashboard will be (or has been) published to. Prefers
  // the live vanity preview when the user has typed something; falls
  // back to the canonical UUID URL otherwise.
  const livePreviewUrls = buildShareUrls({
    workspaceSlug: workspace.slug,
    dashboardId: currentDashboard.id,
    slug: normalisedSlug || currentDashboard.slug,
  });
  const targetUrl = livePreviewUrls.vanity ?? livePreviewUrls.canonical;
  const submit = (): void => {
    // Don't let a stale debounced check or pending request leak through.
    if (normalisedSlug && (hasPendingSlugCheck || isSlugRejected)) {
      return;
    }
    const slugUpdate:
      | { action: "set"; value: string }
      | { action: "clear" }
      | undefined =
      normalisedSlug ? { action: "set", value: normalisedSlug }
      : currentDashboard.slug ? { action: "clear" }
      : undefined;
    publishDashboard({
      dashboardId: currentDashboard.id,
      ...(slugUpdate ? { slug: slugUpdate } : {}),
      publishConfig,
    });
  };

  return (
    <PublishDashboardModalContent
      dashboard={currentDashboard}
      publishConfig={publishConfig}
      shareUrls={livePreviewUrls}
      targetUrl={targetUrl}
      slugInput={slugInput}
      normalisedSlug={normalisedSlug}
      slugErrorMessage={slugErrorMessage}
      hasPendingSlugCheck={hasPendingSlugCheck}
      isSlugAccepted={isSlugAccepted}
      isSlugRejected={isSlugRejected}
      isPublishing={isPublishing}
      onSlugInputChange={setSlugInput}
      onPublishConfigChange={setPublishConfig}
      onSubmit={submit}
      onClose={onClose}
    />
  );
}

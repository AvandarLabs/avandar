import { matchLiteral } from "@avandar/utils";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { modals } from "@mantine/modals";
import { useCallback, useEffect, useState } from "react";
import { DashboardClient } from "@/clients/dashboards/DashboardClient";
import { DashboardSliceBuilder } from "@/clients/dashboards/DashboardSliceBuilder/DashboardSliceBuilder";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { AnalyticsClient } from "@/lib/analytics/AnalyticsClient";
import { PublishSliceConfig } from "@/models/Dashboard/PublishSliceConfig/PublishSliceConfig";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import { PublishDashboardModalContent } from "@/views/DashboardApp/DashboardEditorView/PublishDashboardModal/PublishDashboardModalContent";
import { buildShareUrls } from "@/views/DashboardApp/DashboardShareModal/buildShareUrls";
import { makeDashboardPublishAnalyticsEventFromDashboards } from "@/views/DashboardApp/DashboardShareModal/makeDashboardPublishAnalyticsEventFromDashboards/makeDashboardPublishAnalyticsEventFromDashboards";
import { toVanitySlug } from "@/views/DashboardApp/DashboardShareModal/toVanitySlug/toVanitySlug";
import type { I18n } from "@lingui/core";
import type { DashboardSlugValidationFailure } from "@sbfn/dashboards/DashboardsRoutes/DashboardsRoutes.types";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Dispatch, ReactNode, SetStateAction } from "react";

const SLUG_VALIDATION_DEBOUNCE_MS = 500;

type SlugValidationResult = { isValid: true } | DashboardSlugValidationFailure;

type PublishMutationOptions = {
  currentDashboard: Dashboard.T;
  modalId: string | undefined;
  setCurrentDashboard: Dispatch<SetStateAction<Dashboard.T>>;
  setSlugInput: Dispatch<SetStateAction<string>>;
};

type SlugValidationState = {
  hasPendingSlugCheck: boolean;
  isSlugAccepted: boolean;
  isSlugRejected: boolean;
  slugErrorMessage: string | undefined;
};

type DashboardPublishState = SlugValidationState & {
  currentDashboard: Dashboard.T;
  isPublishing: boolean;
  normalisedSlug: string;
  publishConfig: PublishSliceConfig.Dashboard;
  setPublishConfig: Dispatch<SetStateAction<PublishSliceConfig.Dashboard>>;
  setSlugInput: Dispatch<SetStateAction<string>>;
  slugInput: string;
  submit: () => void;
};

type PublishSubmitOptions = {
  currentDashboard: Dashboard.T;
  normalisedSlug: string;
  publishConfig: PublishSliceConfig.Dashboard;
  publishDashboard: ReturnType<typeof DashboardClient.usePublishDashboard>[0];
  slugValidation: SlugValidationState;
};

type DebouncedSlugValidationOptions = {
  dashboardId: Dashboard.Id;
  normalisedSlug: string;
  setLastValidatedSlug: Dispatch<SetStateAction<string | undefined>>;
  setSlugValidationResult: Dispatch<
    SetStateAction<SlugValidationResult | undefined>
  >;
  validateSlug: ReturnType<typeof DashboardClient.useValidateDashboardSlug>[0];
};

type Props = {
  dashboard: Dashboard.T;
  onClose: () => void;
  /** Mantine modal identifier used to update the title after publication. */
  modalId?: string;
};

function _slugFailureMessage(
  options: Readonly<{ failure: DashboardSlugValidationFailure; i18n: I18n }>,
): string {
  return matchLiteral(options.failure.reason, {
    empty: options.i18n._(msg`The custom URL cannot be empty`),
    spaces: options.i18n._(msg`The custom URL cannot contain spaces`),
    invalid_characters: options.i18n._(
      msg`The custom URL can only contain lowercase letters, numbers, and hyphens`,
    ),
    too_short: options.i18n._(
      msg`The custom URL must be at least ${options.failure.limit ?? 3} characters`,
    ),
    too_long: options.i18n._(
      msg`The custom URL cannot exceed ${options.failure.limit ?? 64} characters`,
    ),
    taken: options.i18n._(msg`This custom URL is already taken`),
    reserved: options.i18n._(
      msg`This custom URL is reserved. Try adding a word to it.`,
    ),
  });
}

function usePublishMutation(
  options: Readonly<PublishMutationOptions>,
): ReturnType<typeof DashboardClient.usePublishDashboard> {
  const { t } = useLingui();
  return DashboardClient.usePublishDashboard({
    onSuccess: (updatedDashboard) => {
      notifySuccess(
        options.currentDashboard.isPublic ?
          t`Dashboard share settings updated.`
        : t`Dashboard published!`,
      );
      const analyticsEvent = makeDashboardPublishAnalyticsEventFromDashboards({
        previousDashboard: options.currentDashboard,
        updatedDashboard,
      });
      void AnalyticsClient.logEvent({
        ...analyticsEvent,
        workspaceId: updatedDashboard.workspaceId,
        app: "dashboards",
      });
      options.setCurrentDashboard(updatedDashboard);
      options.setSlugInput(updatedDashboard.slug ?? "");
      if (options.modalId) {
        modals.updateModal({
          modalId: options.modalId,
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
}

function useDebouncedSlugValidation(
  options: Readonly<DebouncedSlugValidationOptions>,
): void {
  const {
    dashboardId,
    normalisedSlug,
    setLastValidatedSlug,
    setSlugValidationResult,
    validateSlug,
  } = options;
  useEffect(
    function validateNormalisedSlug() {
      if (!normalisedSlug) {
        setSlugValidationResult(undefined);
        setLastValidatedSlug(undefined);
        return;
      }
      const timeoutId = window.setTimeout(() => {
        validateSlug({
          slug: normalisedSlug,
          dashboardId,
          visibility: "public",
        });
      }, SLUG_VALIDATION_DEBOUNCE_MS);
      return () => {
        window.clearTimeout(timeoutId);
      };
    },
    [
      dashboardId,
      normalisedSlug,
      setLastValidatedSlug,
      setSlugValidationResult,
      validateSlug,
    ],
  );
}

function useSlugValidation(
  options: Readonly<{ dashboardId: Dashboard.Id; normalisedSlug: string }>,
): SlugValidationState {
  const { i18n } = useLingui();
  const [slugValidationResult, setSlugValidationResult] = useState<
    SlugValidationResult | undefined
  >();
  const [lastValidatedSlug, setLastValidatedSlug] = useState<string>();
  const [validateSlug, isValidatingSlug] =
    DashboardClient.useValidateDashboardSlug({
      onSuccess: (result, variables) => {
        setSlugValidationResult(result);
        setLastValidatedSlug(variables.slug);
      },
    });
  useDebouncedSlugValidation({
    dashboardId: options.dashboardId,
    normalisedSlug: options.normalisedSlug,
    setLastValidatedSlug,
    setSlugValidationResult,
    validateSlug,
  });
  const hasCurrentResult = lastValidatedSlug === options.normalisedSlug;
  const hasPendingSlugCheck =
    !!options.normalisedSlug && (isValidatingSlug || !hasCurrentResult);
  const isSlugRejected =
    !!options.normalisedSlug &&
    hasCurrentResult &&
    slugValidationResult?.isValid === false;
  const isSlugAccepted =
    !!options.normalisedSlug &&
    hasCurrentResult &&
    slugValidationResult?.isValid === true;
  return {
    hasPendingSlugCheck,
    isSlugAccepted,
    isSlugRejected,
    slugErrorMessage:
      isSlugRejected && slugValidationResult?.isValid === false ?
        _slugFailureMessage({ failure: slugValidationResult, i18n })
      : undefined,
  };
}

function _getSlugUpdate(
  options: Readonly<{
    currentSlug: string | undefined;
    normalisedSlug: string;
  }>,
): { action: "set"; value: string } | { action: "clear" } | undefined {
  if (options.normalisedSlug) {
    return { action: "set", value: options.normalisedSlug };
  }
  if (options.currentSlug) {
    return { action: "clear" };
  }
  return undefined;
}

function usePublishSubmit(options: Readonly<PublishSubmitOptions>): () => void {
  const {
    currentDashboard,
    normalisedSlug,
    publishConfig,
    publishDashboard,
    slugValidation,
  } = options;
  return useCallback((): void => {
    if (
      normalisedSlug &&
      (slugValidation.hasPendingSlugCheck || slugValidation.isSlugRejected)
    ) {
      return;
    }
    const slugUpdate = _getSlugUpdate({
      currentSlug: currentDashboard.slug,
      normalisedSlug,
    });
    publishDashboard({
      dashboardId: currentDashboard.id,
      visibility: "public",
      ...(slugUpdate ? { slug: slugUpdate } : {}),
      publishConfig,
    });
  }, [
    currentDashboard.id,
    currentDashboard.slug,
    normalisedSlug,
    publishConfig,
    publishDashboard,
    slugValidation.hasPendingSlugCheck,
    slugValidation.isSlugRejected,
  ]);
}

function useDashboardPublishState(
  options: Readonly<{ dashboard: Dashboard.T; modalId: string | undefined }>,
): DashboardPublishState {
  const [currentDashboard, setCurrentDashboard] = useState<Dashboard.T>(
    options.dashboard,
  );
  const [slugInput, setSlugInput] = useState(currentDashboard.slug ?? "");
  const normalisedSlug = toVanitySlug(slugInput);
  const [publishDashboard, isPublishing] = usePublishMutation({
    currentDashboard,
    modalId: options.modalId,
    setCurrentDashboard,
    setSlugInput,
  });
  const slugValidation = useSlugValidation({
    dashboardId: currentDashboard.id,
    normalisedSlug,
  });
  const [publishConfig, setPublishConfig] =
    useState<PublishSliceConfig.Dashboard>(() => {
      return DashboardSliceBuilder.readDashboardPublishConfig(
        currentDashboard.config,
      );
    });
  const submit = usePublishSubmit({
    currentDashboard,
    normalisedSlug,
    publishConfig,
    publishDashboard,
    slugValidation,
  });
  return {
    currentDashboard,
    isPublishing,
    normalisedSlug,
    publishConfig,
    setPublishConfig,
    setSlugInput,
    slugInput,
    submit,
    ...slugValidation,
  };
}

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
}: Readonly<Props>): ReactNode {
  const workspace = useCurrentWorkspace();
  const state = useDashboardPublishState({ dashboard, modalId });
  const livePreviewUrls = buildShareUrls({
    workspaceSlug: workspace.slug,
    dashboardId: state.currentDashboard.id,
    slug: state.normalisedSlug || state.currentDashboard.slug,
    visibility: "public",
  });
  const targetUrl = livePreviewUrls.vanity ?? livePreviewUrls.canonical;
  return (
    <PublishDashboardModalContent
      dashboard={state.currentDashboard}
      publishConfig={state.publishConfig}
      shareUrls={livePreviewUrls}
      targetUrl={targetUrl}
      slugInput={state.slugInput}
      normalisedSlug={state.normalisedSlug}
      slugErrorMessage={state.slugErrorMessage}
      hasPendingSlugCheck={state.hasPendingSlugCheck}
      isSlugAccepted={state.isSlugAccepted}
      isSlugRejected={state.isSlugRejected}
      isPublishing={state.isPublishing}
      onSlugInputChange={state.setSlugInput}
      onPublishConfigChange={state.setPublishConfig}
      onSubmit={state.submit}
      onClose={onClose}
    />
  );
}

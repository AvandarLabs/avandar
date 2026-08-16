import { matchLiteral } from "@avandar/utils";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { useCallback, useEffect, useRef, useState } from "react";
import { DashboardClient } from "@/clients/dashboards/DashboardClient";
import { DashboardSliceBuilder } from "@/clients/dashboards/DashboardSliceBuilder/DashboardSliceBuilder";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { AnalyticsClient } from "@/lib/analytics/AnalyticsClient";
import { isShareableDashboardLimitError } from "@/utils/isShareableDashboardLimitError/isShareableDashboardLimitError";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import { buildShareUrls } from "@/views/DashboardApp/DashboardShareModal/buildShareUrls";
import { DashboardPublishingModule } from "@/views/DashboardApp/DashboardShareModal/DashboardPublishingModule/DashboardPublishingModule";
import { makeDashboardPublishAnalyticsEventFromDashboards } from "@/views/DashboardApp/DashboardShareModal/makeDashboardPublishAnalyticsEventFromDashboards/makeDashboardPublishAnalyticsEventFromDashboards";
import { toVanitySlug } from "@/views/DashboardApp/DashboardShareModal/toVanitySlug/toVanitySlug";
import type { GeneralAccessValue } from "@/components/permissions/ShareResourceModal/GeneralAccessModule/GeneralAccessModule";
import type { PublishSliceConfig } from "@/models/Dashboard/PublishSliceConfig/PublishSliceConfig";
import type { PublishActionKind } from "@/views/DashboardApp/DashboardShareModal/DashboardPublishingModule/DashboardPublishingModule";
import type { I18n } from "@lingui/core";
import type { DashboardSlugValidationFailure } from "@sbfn/dashboards/DashboardsRoutes/DashboardsRoutes.types";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Dispatch, RefObject, SetStateAction } from "react";

const SLUG_VALIDATION_DEBOUNCE_MS = 500;

type SlugValidationResult = { isValid: true } | DashboardSlugValidationFailure;

type SlugValidationState = {
  hasPendingSlugCheck: boolean;
  isSlugAccepted: boolean;
  isSlugRejected: boolean;
  slugErrorMessage: string | undefined;
};

/**
 * Which slug check the hook is currently waiting on. Recorded at dispatch and
 * compared in `onSuccess` so a response that a later keystroke has already
 * superseded is dropped instead of overwriting the newer answer.
 */
type SlugValidationRequest = {
  slug: string;
  visibility: Dashboard.Visibility;
};

type DebouncedSlugValidationOptions = {
  dashboardId: Dashboard.Id;
  normalisedSlug: string;
  targetVisibility: Dashboard.Visibility;
  latestRequestRef: RefObject<SlugValidationRequest | undefined>;
  setLastValidatedSlug: Dispatch<SetStateAction<string | undefined>>;
  setSlugValidationResult: Dispatch<
    SetStateAction<SlugValidationResult | undefined>
  >;
  validateSlug: ReturnType<typeof DashboardClient.useValidateDashboardSlug>[0];
};

type DashboardPublishingControl = SlugValidationState & {
  currentDashboard: Dashboard.T;
  targetVisibility: Dashboard.Visibility;
  actionKind: PublishActionKind;
  isBusy: boolean;
  shareUrls: ReturnType<typeof buildShareUrls>;
  urlPrefix: string;
  slugInput: string;
  normalisedSlug: string;
  publishConfig: PublishSliceConfig.Dashboard;
  onSlugInputChange: (slugInput: string) => void;
  onPublishConfigChange: (config: PublishSliceConfig.Dashboard) => void;
  onGeneralAccessChange: (value: GeneralAccessValue) => void;
  onPrimaryAction: () => void;
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

/**
 * Debounces the slug check against the namespace the target audience implies.
 *
 * `targetVisibility` is a dependency because the two audiences have separate
 * slug namespaces: a name free among public dashboards can be taken among the
 * workspace's, so moving the target has to re-run the check.
 */
function useDebouncedSlugValidation(
  options: Readonly<DebouncedSlugValidationOptions>,
): void {
  const {
    dashboardId,
    normalisedSlug,
    targetVisibility,
    latestRequestRef,
    setLastValidatedSlug,
    setSlugValidationResult,
    validateSlug,
  } = options;
  useEffect(
    function validateNormalisedSlug() {
      if (!normalisedSlug) {
        latestRequestRef.current = undefined;
        setSlugValidationResult(undefined);
        setLastValidatedSlug(undefined);
        return;
      }
      const timeoutId = window.setTimeout(() => {
        if (targetVisibility === "draft") {
          // A draft has no URL, so it has no namespace to collide in.
          return;
        }
        // Recorded BEFORE the request goes out, so `onSuccess` can tell this
        // response from one the user has already typed past. The cleanup below
        // only cancels a request that has not fired yet; one already in flight
        // still resolves, and without this it could land after a newer answer
        // and leave the field spinning on a slug nobody is waiting for.
        latestRequestRef.current = {
          slug: normalisedSlug,
          visibility: targetVisibility,
        };
        validateSlug({
          slug: normalisedSlug,
          dashboardId,
          visibility: targetVisibility,
        });
      }, SLUG_VALIDATION_DEBOUNCE_MS);
      return () => {
        window.clearTimeout(timeoutId);
      };
    },
    [
      dashboardId,
      normalisedSlug,
      targetVisibility,
      latestRequestRef,
      setLastValidatedSlug,
      setSlugValidationResult,
      validateSlug,
    ],
  );
}

function useSlugValidation(
  options: Readonly<{
    dashboardId: Dashboard.Id;
    normalisedSlug: string;
    targetVisibility: Dashboard.Visibility;
  }>,
): SlugValidationState {
  const { i18n } = useLingui();
  const [slugValidationResult, setSlugValidationResult] = useState<
    SlugValidationResult | undefined
  >();
  const [lastValidatedSlug, setLastValidatedSlug] = useState<string>();
  const [lastValidatedVisibility, setLastValidatedVisibility] =
    useState<Dashboard.Visibility>();
  const latestRequestRef = useRef<SlugValidationRequest | undefined>(undefined);
  const [validateSlug, isValidatingSlug] =
    DashboardClient.useValidateDashboardSlug({
      onSuccess: (result, variables) => {
        // Every dispatched check gets its own `onSuccess`, and the network is
        // free to answer them out of order. Writing a superseded answer would
        // point `lastValidatedSlug` at a slug the field no longer holds, which
        // makes `hasCurrentResult` false with nothing left in flight to make
        // it true again: the spinner never clears and `onPrimaryAction`
        // silently refuses to publish.
        const latestRequest = latestRequestRef.current;
        if (
          latestRequest === undefined ||
          variables.slug !== latestRequest.slug ||
          variables.visibility !== latestRequest.visibility
        ) {
          return;
        }
        setSlugValidationResult(result);
        setLastValidatedSlug(variables.slug);
        setLastValidatedVisibility(variables.visibility);
      },
    });
  useDebouncedSlugValidation({
    dashboardId: options.dashboardId,
    normalisedSlug: options.normalisedSlug,
    targetVisibility: options.targetVisibility,
    latestRequestRef,
    setLastValidatedSlug,
    setSlugValidationResult,
    validateSlug,
  });

  // A draft has no URL, so there is nothing to check and nothing to report.
  // Without this the flags would report a check that the debounced effect
  // deliberately never runs, leaving a spinner that can never resolve.
  const isSlugCheckable = options.targetVisibility !== "draft";

  // The two audiences have separate slug namespaces, so an answer is only
  // current when it was given for BOTH this slug and this namespace. Matching
  // on the slug alone would report a public "taken" verdict as authoritative
  // for the workspace namespace, where the slug may be free.
  const hasCurrentResult =
    lastValidatedSlug === options.normalisedSlug &&
    lastValidatedVisibility === options.targetVisibility;
  const hasPendingSlugCheck =
    isSlugCheckable &&
    !!options.normalisedSlug &&
    (isValidatingSlug || !hasCurrentResult);
  const isSlugRejected =
    isSlugCheckable &&
    !!options.normalisedSlug &&
    hasCurrentResult &&
    slugValidationResult?.isValid === false;
  const isSlugAccepted =
    isSlugCheckable &&
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

/**
 * Owns everything about a dashboard's publication that the share modal needs.
 *
 * The target visibility is initialised from the persisted one, which is what
 * makes a public dashboard open showing "Anyone with the link" and makes any
 * later divergence a visible pending change rather than a silent one.
 *
 * The dropdown never writes visibility: it moves the target, and
 * `onPrimaryAction` is the only thing that calls the mutations.
 */
export function useDashboardPublishingControl(
  options: Readonly<{
    dashboard: Dashboard.T;
    /**
     * Called when the database, not the UI gate, is what refused the publish.
     * The caller owns the upgrade modal, so the hook reports the refusal
     * rather than rendering anything itself.
     */
    onShareableLimitReached: () => void;
  }>,
): DashboardPublishingControl {
  const { t } = useLingui();
  const { onShareableLimitReached } = options;
  const workspace = useCurrentWorkspace();
  const [currentDashboard, setCurrentDashboard] = useState(options.dashboard);
  const [targetVisibility, setTargetVisibility] =
    useState<Dashboard.Visibility>(options.dashboard.visibility);
  const [slugInput, setSlugInput] = useState(currentDashboard.slug ?? "");
  const normalisedSlug = toVanitySlug(slugInput);
  const [publishConfig, setPublishConfig] = useState(() => {
    return DashboardSliceBuilder.readDashboardPublishConfig(
      currentDashboard.config,
    );
  });

  const actionKind = DashboardPublishingModule.getPublishActionKind({
    visibility: currentDashboard.visibility,
    targetVisibility,
  });

  const [publishDashboard, isPublishing] = DashboardClient.usePublishDashboard({
    onSuccess: (updatedDashboard) => {
      notifySuccess(
        currentDashboard.visibility === "draft" ?
          t`Dashboard published!`
        : t`Dashboard share settings updated.`,
      );
      void AnalyticsClient.logEvent({
        ...makeDashboardPublishAnalyticsEventFromDashboards({
          previousDashboard: currentDashboard,
          updatedDashboard,
        }),
        workspaceId: updatedDashboard.workspaceId,
        app: "dashboards",
      });
      setCurrentDashboard(updatedDashboard);
      setSlugInput(updatedDashboard.slug ?? "");
      setTargetVisibility(updatedDashboard.visibility);
    },
    onError: (error: Error) => {
      console.error(error);
      // The UI gate in `DashboardShareModal` is deliberately optimistic while
      // its permission query is in flight, and the answer it caches counts the
      // whole workspace while the exemption is per dashboard, so a publish
      // elsewhere in the workspace can leave the gate stale. In that window the
      // database trigger is the only thing that stops the publish, and the
      // generic toast would tell the user to "try again" at something that can
      // never succeed on this plan.
      //
      // The upgrade modal rather than a toast, because it is the SAME surface
      // the gate offers when it does manage to answer in time. The two paths
      // are the same refusal found at different moments, and answering them
      // differently would make an upgrade reachable or not depending on how
      // fast a query returned. The modal also names the plan and its limit,
      // which a toast cannot do without restating that copy a third time.
      if (isShareableDashboardLimitError(error)) {
        onShareableLimitReached();
        return;
      }
      notifyError({
        title: t`Could not publish dashboard`,
        message: t`Please try again. Your dashboard has not been published.`,
      });
    },
  });

  const [unpublishDashboard, isUnpublishing] =
    DashboardClient.useUnpublishDashboard({
      onSuccess: (updatedDashboard) => {
        notifySuccess(t`Dashboard unpublished.`);
        void AnalyticsClient.logEvent({
          event: "dashboard.unpublished",
          payload: {
            dashboardId: updatedDashboard.id,
            priorVisibility: currentDashboard.visibility,
          },
          workspaceId: updatedDashboard.workspaceId,
          app: "dashboards",
        });
        setCurrentDashboard(updatedDashboard);
        setTargetVisibility(updatedDashboard.visibility);
      },
      onError: (error: Error) => {
        console.error(error);
        notifyError({
          title: t`Could not unpublish dashboard`,
          message: t`Please try again. Your dashboard is still published.`,
        });
      },
    });

  // Called unconditionally and before the return: spreading a hook call inside
  // the returned object literal works but hides a hook in an expression, which
  // the lint rules and the next reader both object to.
  const slugValidation = useSlugValidation({
    dashboardId: currentDashboard.id,
    normalisedSlug,
    targetVisibility,
  });
  const { hasPendingSlugCheck, isSlugRejected } = slugValidation;

  const onPrimaryAction = useCallback((): void => {
    // Both draft-targeting kinds live here, so the branch below narrows the
    // target to a published visibility without an assertion: a future kind
    // that targets `draft` becomes a compile error rather than a bad request.
    if (targetVisibility === "draft") {
      if (actionKind === "unpublish") {
        unpublishDashboard({ dashboardId: currentDashboard.id });
      }
      return;
    }
    // Publishing over a slug the server has already rejected, or has not
    // answered on yet, buys a generic failure toast in place of the inline
    // error the user is looking at. This is checked after the unpublish branch
    // so a slug the user is about to discard cannot block unpublishing.
    if (normalisedSlug && (hasPendingSlugCheck || isSlugRejected)) {
      return;
    }
    // Every remaining kind is a publish to the target; only the label differs.
    const slugUpdate =
      normalisedSlug ? { action: "set" as const, value: normalisedSlug }
      : currentDashboard.slug ? { action: "clear" as const }
      : undefined;
    publishDashboard({
      dashboardId: currentDashboard.id,
      visibility: targetVisibility,
      ...(slugUpdate ? { slug: slugUpdate } : {}),
      publishConfig,
    });
  }, [
    actionKind,
    currentDashboard.id,
    currentDashboard.slug,
    hasPendingSlugCheck,
    isSlugRejected,
    normalisedSlug,
    publishConfig,
    publishDashboard,
    targetVisibility,
    unpublishDashboard,
  ]);

  const urlVisibility = targetVisibility === "public" ? "public" : "workspace";
  const shareUrls = buildShareUrls({
    workspaceSlug: workspace.slug,
    dashboardId: currentDashboard.id,
    slug: normalisedSlug || currentDashboard.slug,
    visibility: urlVisibility,
  });

  return {
    currentDashboard,
    targetVisibility,
    actionKind,
    isBusy: isPublishing || isUnpublishing,
    shareUrls,
    urlPrefix: urlVisibility === "public" ? "/d/" : `/${workspace.slug}/d/`,
    slugInput,
    normalisedSlug,
    publishConfig,
    onSlugInputChange: setSlugInput,
    onPublishConfigChange: setPublishConfig,
    onGeneralAccessChange: (value) => {
      setTargetVisibility(DashboardPublishingModule.targetVisibilityFor(value));
    },
    onPrimaryAction,
    ...slugValidation,
  };
}

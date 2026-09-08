import { useLingui } from "@lingui/react/macro";
import { useRef, useState } from "react";
import { DashboardClient } from "@/clients/dashboards/DashboardClient/DashboardClient";
import { makeSlugErrorMessageFromValidationFailure } from "@/views/DashboardApp/DashboardShareModal/useDashboardPublishingControl/useSlugValidation/makeSlugErrorMessageFromValidationFailure";
import { useDebouncedSlugValidation } from "@/views/DashboardApp/DashboardShareModal/useDashboardPublishingControl/useSlugValidation/useDebouncedSlugValidation";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type {
  SlugValidationRequest,
  SlugValidationResult,
  SlugValidationState,
} from "@/views/DashboardApp/DashboardShareModal/useDashboardPublishingControl/useSlugValidation/useSlugValidation.types";

/**
 * Tracks what the server has said about the slug currently in the field.
 *
 * The three flags are mutually exclusive by construction, and all three are
 * false while there is nothing to check, which is what lets the share modal
 * treat "no answer yet" and "no question asked" as the same quiet state.
 */
export function useSlugValidation(
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
      isSlugRejected && slugValidationResult?.isValid === false
        ? makeSlugErrorMessageFromValidationFailure({
            failure: slugValidationResult,
            i18n,
          })
        : undefined,
  };
}

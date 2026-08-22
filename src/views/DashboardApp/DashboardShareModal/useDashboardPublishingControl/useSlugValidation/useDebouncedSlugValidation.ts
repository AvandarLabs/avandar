import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { DashboardClient } from "@/clients/dashboards/DashboardClient/DashboardClient";
import type {
  SlugValidationRequest,
  SlugValidationResult,
} from "@/views/DashboardApp/DashboardShareModal/useDashboardPublishingControl/useSlugValidation/useSlugValidation.types";
import type { Dispatch, RefObject, SetStateAction } from "react";

import { useEffect } from "react";

/** How long the field stays quiet before a slug check goes out. */
const SLUG_VALIDATION_DEBOUNCE_MS = 500;

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

/**
 * Debounces the slug check against the namespace the target audience implies.
 *
 * `targetVisibility` is a dependency because the two audiences have separate
 * slug namespaces: a name free among public dashboards can be taken among the
 * workspace's, so moving the target has to re-run the check.
 */
export function useDebouncedSlugValidation(
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

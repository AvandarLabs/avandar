import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { GeneralAccessValue } from "@/components/permissions/ShareResourceModal/GeneralAccessModule/GeneralAccessModule";
import type { PublishSliceConfig } from "@/models/Dashboard/PublishSliceConfig/PublishSliceConfig";
import type { PublishActionKind } from "@/views/DashboardApp/DashboardShareModal/DashboardPublishingModule/DashboardPublishingModule";
import type { SlugValidationState } from "@/views/DashboardApp/DashboardShareModal/useDashboardPublishingControl/useSlugValidation/useSlugValidation.types";

import { useCallback, useState } from "react";

import { DashboardSliceBuilder } from "@/clients/dashboards/DashboardSliceBuilder/DashboardSliceBuilder";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { DashboardPublishingModule } from "@/views/DashboardApp/DashboardShareModal/DashboardPublishingModule/DashboardPublishingModule";
import { makeShareUrlsFromPublishTarget } from "@/views/DashboardApp/DashboardShareModal/makeShareUrlsFromPublishTarget/makeShareUrlsFromPublishTarget";
import { makeVanitySlugFromText } from "@/views/DashboardApp/DashboardShareModal/makeVanitySlugFromText/makeVanitySlugFromText";
import { usePublishDashboardMutation } from "@/views/DashboardApp/DashboardShareModal/useDashboardPublishingControl/usePublishDashboardMutation/usePublishDashboardMutation";
import { useSlugValidation } from "@/views/DashboardApp/DashboardShareModal/useDashboardPublishingControl/useSlugValidation/useSlugValidation";
import { useUnpublishDashboardMutation } from "@/views/DashboardApp/DashboardShareModal/useDashboardPublishingControl/useUnpublishDashboardMutation";

type DashboardPublishingControl = SlugValidationState & {
  currentDashboard: Dashboard.T;
  targetVisibility: Dashboard.Visibility;
  actionKind: PublishActionKind;
  isBusy: boolean;
  shareUrls: ReturnType<typeof makeShareUrlsFromPublishTarget>;
  slugInput: string;
  normalisedSlug: string;
  publishConfig: PublishSliceConfig.Dashboard;
  onSlugInputChange: (slugInput: string) => void;
  onPublishConfigChange: (config: PublishSliceConfig.Dashboard) => void;
  onGeneralAccessChange: (value: GeneralAccessValue) => void;
  onPrimaryAction: () => void;
};

/**
 * Owns everything about a dashboard's publication that the share modal needs.
 *
 * The target visibility is initialised from `getInitialTargetVisibility`: a
 * published dashboard opens on what is persisted, and a draft opens on the
 * General access shape already on the row, so an unrestricted draft is ready
 * to publish instead of showing a disabled Publish button next to "Anyone in
 * Dashboards".
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
  const { onShareableLimitReached } = options;
  const workspace = useCurrentWorkspace();
  const [currentDashboard, setCurrentDashboard] = useState(options.dashboard);
  const [targetVisibility, setTargetVisibility] =
    useState<Dashboard.Visibility>(() => {
      return DashboardPublishingModule.getInitialTargetVisibility(
        options.dashboard,
      );
    });
  const [slugInput, setSlugInput] = useState(currentDashboard.slug ?? "");
  const normalisedSlug = makeVanitySlugFromText(slugInput);
  const [publishConfig, setPublishConfig] = useState(() => {
    return DashboardSliceBuilder.readDashboardPublishConfig(
      currentDashboard.config,
    );
  });

  const actionKind =
    DashboardPublishingModule.getPublishActionKindFromVisibilities({
      visibility: currentDashboard.visibility,
      targetVisibility,
    });

  const [publishDashboard, isPublishing] = usePublishDashboardMutation({
    currentDashboard,
    onPublished: (updatedDashboard) => {
      setCurrentDashboard(updatedDashboard);
      setSlugInput(updatedDashboard.slug ?? "");
      setTargetVisibility(updatedDashboard.visibility);
    },
    onShareableLimitReached,
  });

  const [unpublishDashboard, isUnpublishing] = useUnpublishDashboardMutation({
    currentDashboard,
    onUnpublished: (updatedDashboard) => {
      setCurrentDashboard(updatedDashboard);
      setTargetVisibility(updatedDashboard.visibility);
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
    const slugUpdate = normalisedSlug
      ? { action: "set" as const, value: normalisedSlug }
      : currentDashboard.slug
        ? { action: "clear" as const }
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
  const shareUrls = makeShareUrlsFromPublishTarget({
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
    slugInput,
    normalisedSlug,
    publishConfig,
    onSlugInputChange: setSlugInput,
    onPublishConfigChange: setPublishConfig,
    onGeneralAccessChange: (value) => {
      setTargetVisibility(
        DashboardPublishingModule.getTargetVisibilityFromGeneralAccessValue(
          value,
        ),
      );
    },
    onPrimaryAction,
    ...slugValidation,
  };
}

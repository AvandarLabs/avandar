import type { GeneralAccessValue } from "@/components/permissions/ShareResourceModal/GeneralAccessModule/GeneralAccessModule";
import type { Dashboard } from "$/models/Dashboard/Dashboard";

/**
 * Which publication state each General access value asks for.
 *
 * "Only me" targets `draft` on purpose: publishing keeps a snapshot object and
 * a live URL alive, and doing that for an audience of one is storage and risk
 * with no reader. "Restricted" targets `workspace` because a restricted but
 * published dashboard is exactly the internal-report-for-three-people shape
 * this feature was asked for.
 */
const _TARGET_VISIBILITY_BY_ACCESS_VALUE = {
  private: "draft",
  restricted: "workspace",
  workspace: "workspace",
  public: "public",
} as const satisfies Record<GeneralAccessValue, Dashboard.Visibility>;

/** What the modal's primary button does next. */
export type PublishActionKind =
  | "publish_workspace"
  | "publish_public"
  | "republish"
  | "make_internal"
  | "unpublish"
  | "disabled_no_audience";

function _targetVisibilityFor(value: GeneralAccessValue): Dashboard.Visibility {
  return _TARGET_VISIBILITY_BY_ACCESS_VALUE[value];
}

/**
 * Resolves the primary action from what is persisted and what the dropdown
 * currently asks for.
 *
 * Every kind except `unpublish` and `disabled_no_audience` calls
 * `publishDashboard` with the target visibility; the kinds differ only in the
 * label, because "Publish", "Update & republish", and "Make internal" are
 * three very different sentences for the same call.
 */
function _getPublishActionKind(
  options: Readonly<{
    visibility: Dashboard.Visibility;
    targetVisibility: Dashboard.Visibility;
  }>,
): PublishActionKind {
  if (options.targetVisibility === "draft") {
    return options.visibility === "draft" ?
        "disabled_no_audience"
      : "unpublish";
  }
  if (options.visibility === options.targetVisibility) {
    return "republish";
  }
  if (options.targetVisibility === "public") {
    return "publish_public";
  }
  return options.visibility === "public" ?
      "make_internal"
    : "publish_workspace";
}

/** Stateless mappings between General access, visibility, and the action. */
export const DashboardPublishingModule = {
  targetVisibilityFor: _targetVisibilityFor,
  getPublishActionKind: _getPublishActionKind,
} as const;

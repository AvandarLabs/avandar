import type { NuxAnchor } from "@/components/Nux/nuxAnchors";
import type { NuxEventName } from "@/components/Nux/nuxEvents";
import type { MessageDescriptor } from "@lingui/core";
import type { NuxMilestoneKey } from "$/models/Nux/NuxProgress.types";
import type { Placement } from "react-joyride";

/**
 * Where the checklist sends the user when a milestone is opened.
 *
 * `dashboard_editor` routes using the id captured from `dashboard.created`.
 * It is needed because `SaveToDashboardModal` does NOT navigate on create: it
 * shows a toast with an "Open dashboard" link and closes itself, so after
 * milestone 3 the user is still standing in the Data Explorer.
 */
export type NuxMilestoneRoute =
  | { kind: "data_import" }
  | { kind: "data_explorer" }
  | { kind: "dashboard_editor" };

export type NuxStep = {
  anchor: NuxAnchor;
  title: MessageDescriptor;
  body: MessageDescriptor;
  placement: Placement | "auto" | "center";
  /**
   * Renders the "download our sample" link beneath the body. Only milestone
   * 1's first tooltip sets it, which is the one place a user can be stuck for
   * want of a spreadsheet.
   */
  showSampleDownload?: boolean;
  /**
   * How long Joyride waits for this step's target, in milliseconds. Steps
   * whose target only appears after the user acts need far longer than the
   * 1000ms default.
   */
  targetWaitTimeoutMs?: number;
};

export type NuxMilestone = {
  key: NuxMilestoneKey;
  title: MessageDescriptor;
  /** One line under the title in the checklist panel. */
  summary: MessageDescriptor;
  route: NuxMilestoneRoute;
  completionEvent: NuxEventName;
  steps: readonly NuxStep[];
};

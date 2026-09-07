import type { NuxProgress } from "$/models/NuxProgress/NuxProgress";
import type { NuxAnchor } from "@/components/Nux/NuxAnchors/NuxAnchors";
import type { NuxEventName } from "@/components/Nux/NuxEvents/NuxEvents";
import type { MessageDescriptor } from "@lingui/core";
import type { Placement, Step } from "react-joyride";

/**
 * Where the checklist sends the user when a milestone is opened.
 *
 * `dashboard_editor` routes using the id captured from `dashboard.created`.
 * It is needed because `SaveToDashboardModal` does NOT navigate on create: it
 * shows a toast with an "Open dashboard" link and closes itself, so after
 * `build_dashboard` the user is still standing in the Data Explorer.
 */
export type NuxMilestoneRoute =
  | { kind: "data_import" }
  | { kind: "data_explorer" }
  | { kind: "dashboard_editor" };

/**
 * Live facts a step's `when` is evaluated against.
 *
 * `explorerHasQueryResults` matches Save's disable rule: at least one result
 * row and SQL that can be saved. `generalAccessIsWorkspace` matches whether
 * the share modal's role picker is mounted.
 */
export type NuxStepFacts = {
  explorerHasQueryResults: boolean;
  /** General access is currently `workspace`, so the role picker is mounted. */
  generalAccessIsWorkspace: boolean;
};

/**
 * Named fact a tooltip requires in order to appear. Omitted `when` means
 * the tooltip always shows.
 */
export type NuxStepWhen =
  | "explorerHasQueryResults"
  | "explorerHasNoQueryResults"
  | "generalAccessIsWorkspace";

/**
 * Joyride step fields this tutorial type does not accept.
 *
 * `target` / `content` / `title` / `data` are translated from NUX-owned
 * fields. `skipBeacon`, `isFixed`, and `skipScroll` are product invariants
 * the mapper sets. Tooltip chrome (`locale`, `styles`, the component
 * slots) belongs on `NuxTour`, not a tutorial step.
 */
type NuxStepJoyrideBlocked = Pick<
  Step,
  | "target"
  | "content"
  | "title"
  | "data"
  | "skipBeacon"
  | "isFixed"
  | "skipScroll"
  | "arrowComponent"
  | "beaconComponent"
  | "loaderComponent"
  | "tooltipComponent"
  | "locale"
  | "styles"
>;

/**
 * One tooltip in a tutorial. NUX-owned fields plus any Joyride `Step`
 * option that is not in `NuxStepJoyrideBlocked`. `scrollOffset`,
 * `spotlightPadding`, `offset`, `scrollTarget`, and the rest pass through
 * to Joyride with no extra mapping.
 */
export type NuxStep = {
  anchor: NuxAnchor;
  title: MessageDescriptor;
  body: MessageDescriptor;
  placement: Placement | "auto" | "center";
  /**
   * When set, Joyride spotlights this anchor while the tooltip positions
   * against `anchor`. Use when the spotlight should cover a large region but
   * the tooltip must attach to a smaller edge.
   */
  spotlightAnchor?: NuxAnchor;
  /**
   * When set, `<0>` in `body` renders as a download link to this href.
   */
  bodyLinkHref?: string;
  /**
   * Hides Next. The tour advances on its own once this anchor is in the
   * document (upload parsed, tab opened, share modal up).
   */
  disableNextUntilAnchor?: NuxAnchor;
  /**
   * Hides Next. The tour advances on its own once this outcome has fired,
   * so the following tooltip is a payoff the user cannot skip into.
   */
  disableNextUntilEvent?: NuxEventName;
  /**
   * How long Joyride waits for this step's target, in milliseconds. Steps
   * whose target only appears after the user acts need far longer than the
   * 1000ms default.
   */
  targetWaitTimeoutMs?: number;
  /**
   * Reset the nearest overflow ancestor to the top when this tooltip
   * appears, and skip Joyride's animated scroll so the overlay cannot
   * interrupt the jump. Needed after a route change that reuses a nested
   * scroller (the Data Sources `ScrollArea` keeps the import form's scroll
   * offset).
   */
  scrollParentToTop?: boolean;
  /**
   * Hide Back. Use after an irreversible outcome (saved a dataset, shared a
   * dashboard) where the previous tooltip's target is gone or cannot be
   * undone. Defaults to showing Back whenever this is not the first tooltip.
   */
  hideBack?: boolean;
  /**
   * Hide the tooltip caret. Use when the tooltip sits on a decorative anchor
   * or a large region where a pointer would mislead. Defaults to showing the
   * caret.
   */
  hideCaret?: boolean;
  /**
   * Opens the chat panel when this step becomes active. Use only when the
   * step spotlights the composer or otherwise requires chat; other steps
   * leave the panel in whatever state the user last set.
   */
  openChatPanel?: boolean;
  /**
   * When set, this tooltip is omitted unless the named fact is true.
   * Re-evaluated live, so running a query can drop a "run a query first"
   * tooltip and reveal Save without moving the step index.
   */
  when?: NuxStepWhen;
} & Omit<Partial<Step>, keyof NuxStepJoyrideBlocked>;

/** One Get started checklist row and the tour it opens. */
export type NuxMilestone = {
  key: NuxProgress.MilestoneKey;
  title: MessageDescriptor;
  /** One line under the title in the checklist panel. */
  summary: MessageDescriptor;
  route: NuxMilestoneRoute;
  completionEvent: NuxEventName;
  /**
   * Milestones that must already be complete before this row can be
   * opened. Locked rows stay visible so the path is obvious, but they
   * cannot start a tour whose targets do not exist yet.
   */
  prerequisites?: readonly NuxProgress.MilestoneKey[];
  steps: readonly NuxStep[];
};

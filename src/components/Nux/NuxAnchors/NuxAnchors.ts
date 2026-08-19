const _anchorIds = {
  /** The file picker on the Import page's Upload tab. */
  datasetUploadForm: "dataset-upload-form",
  /** The name-and-save form that appears once a file has been parsed. */
  datasetImportForm: "dataset-import-form",
  /**
   * The "Data Summary" TAB on the dataset page, not the panel behind it.
   * That page opens on Metadata, so the profile itself is unmounted when the
   * tutorial arrives; anchoring the panel would wait out the step's timeout
   * against an element that does not exist yet.
   */
  datasetSummaryTab: "dataset-summary-tab",
  /** The auto-generated column profile itself, once its tab is open. */
  datasetSummary: "dataset-summary",
  /** The chat panel's message composer. */
  chatComposer: "chat-composer",
  /** The Data Explorer's chart area. */
  explorerCanvas: "explorer-canvas",
  /**
   * A thin hook at the top of the canvas for tooltip placement. The canvas
   * itself is viewport-tall, so anchoring a `top` tooltip to it clips above
   * the viewport; this hook sits on the upper edge instead.
   */
  explorerCanvasTooltip: "explorer-canvas-tooltip",
  /** The Visualizations tab in the Data Explorer drawer. */
  explorerVizTab: "explorer-viz-tab",
  /** The Visualizations panel body in the Data Explorer drawer. */
  explorerVizPanel: "explorer-viz-panel",
  /** The Save dropdown's trigger button in the Data Explorer toolbar. */
  explorerSaveMenu: "explorer-save-menu",
  /** The "Save to dashboard" item inside the Save dropdown. */
  explorerSaveToDashboardItem: "explorer-save-to-dashboard-item",
  /** The Save to dashboard modal's root, for a full-modal spotlight. */
  explorerSaveToDashboardModal: "explorer-save-to-dashboard-modal",
  /** The "Create dashboard & save" button in create mode. */
  explorerCreateDashboardButton: "explorer-create-dashboard-button",
  /** The Share button in the dashboard editor toolbar. */
  dashboardShareButton: "dashboard-share-button",
  /** The General access dropdown in the share modal. */
  generalAccessSelect: "general-access-select",
  /** The workspace role picker. Only mounts once access is `workspace`. */
  shareRoleSelect: "share-role-select",
  /** The primary publish action in the share modal footer. */
  dashboardPublishButton: "dashboard-publish-button",
} as const;

/** One of the DOM hooks the tutorial is allowed to spotlight. */
export type NuxAnchor = (typeof _anchorIds)[keyof typeof _anchorIds];

function _hasLayoutBox(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    (rect.top >= 1 || rect.left >= 1) &&
    _isVisibleInTree(element)
  );
}

function _isVisibleInTree(element: HTMLElement): boolean {
  let current: HTMLElement | null = element;
  while (current && current !== document.documentElement) {
    const { display, visibility } = getComputedStyle(current);
    if (display === "none" || visibility === "hidden") {
      return false;
    }
    current = current.parentElement;
  }
  return true;
}

/**
 * Every DOM hook the onboarding tutorial spotlights, in one place.
 *
 * Steps target `[data-nux="..."]` and never a class name or a DOM shape, so a
 * Mantine upgrade or a styling refactor cannot silently break the tour. Keeping
 * the values here rather than inline at each call site means a rename is one
 * edit, and `firstDashboard.ts` cannot invent an anchor nothing renders.
 */
export const NuxAnchors = {
  /** The anchor id for each spotlightable element. */
  ids: _anchorIds,

  /** Spread onto the element that should be spotlighted. */
  props: (anchor: NuxAnchor): { "data-nux": NuxAnchor } => {
    return { "data-nux": anchor };
  },

  /** The CSS selector Joyride uses to find an anchored element. */
  selector: (anchor: NuxAnchor): string => {
    return `[data-nux="${anchor}"]`;
  },

  /**
   * The first anchored element that already has a layout box off the
   * viewport origin.
   *
   * Joyride's default `querySelector` takes the first match, including a
   * copy in Puck's collapsed header menu (`position: absolute; left: 0`).
   * Measuring that parks the tooltip at the viewport origin, even when the
   * copy has a non-zero box.
   */
  queryLaidOut: (anchor: NuxAnchor): HTMLElement | null => {
    const matches = document.querySelectorAll(NuxAnchors.selector(anchor));
    return (
      Array.from(matches).find((match): match is HTMLElement => {
        return match instanceof HTMLElement && _hasLayoutBox(match);
      }) ?? null
    );
  },
};

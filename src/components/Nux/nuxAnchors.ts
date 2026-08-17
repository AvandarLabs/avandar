/**
 * Every DOM hook the onboarding tutorial spotlights, in one place.
 *
 * Steps target `[data-nux="..."]` and never a class name or a DOM shape, so a
 * Mantine upgrade or a styling refactor cannot silently break the tour. Keeping
 * the values here rather than inline at each call site means a rename is one
 * edit, and `firstDashboard.ts` cannot invent an anchor nothing renders.
 */
export const NuxAnchors = {
  /** The file picker on the Import page's Upload tab. */
  datasetUploadForm: "dataset-upload-form",
  /** The name-and-save form that appears once a file has been parsed. */
  datasetImportForm: "dataset-import-form",
  /** The auto-generated column profile on the dataset page. */
  datasetSummary: "dataset-summary",
  /** The chat panel's message composer. */
  chatComposer: "chat-composer",
  /** The Data Explorer's chart area. */
  explorerCanvas: "explorer-canvas",
  /** The Visualizations tab in the Data Explorer drawer. */
  explorerVizTab: "explorer-viz-tab",
  /** The Save dropdown's trigger button in the Data Explorer toolbar. */
  explorerSaveMenu: "explorer-save-menu",
  /** The Share button in the dashboard editor toolbar. */
  dashboardShareButton: "dashboard-share-button",
  /** The General access dropdown in the share modal. */
  generalAccessSelect: "general-access-select",
  /** The workspace role picker, which only mounts once access is `workspace`. */
  shareRoleSelect: "share-role-select",
} as const;

export type NuxAnchor = (typeof NuxAnchors)[keyof typeof NuxAnchors];

/** Spread onto the element that should be spotlighted. */
export function nuxAnchorProps(anchor: NuxAnchor): { "data-nux": NuxAnchor } {
  return { "data-nux": anchor };
}

/** The CSS selector Joyride uses to find an anchored element. */
export function nuxAnchorSelector(anchor: NuxAnchor): string {
  return `[data-nux="${anchor}"]`;
}

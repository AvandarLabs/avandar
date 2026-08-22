import type { NuxMilestone } from "@/components/Nux/tutorials/NuxTutorial.types";

import { msg } from "@lingui/core/macro";

import { NuxAnchors } from "@/components/Nux/NuxAnchors/NuxAnchors";

/**
 * How long a step waits for a target that only appears after the user does
 * something. The default 1000ms is right for a target already on the page and
 * far too short for one behind a file picker or a modal.
 */
const AWAIT_USER_ACTION_MS = 60_000;

/**
 * Static sample under `public/samples/`, served as-is by Vite. The download
 * link in milestone 1's first tooltip uses this path, so a dead href is a
 * missing file rather than a build-wiring problem.
 */
export const FIRST_DASHBOARD_SAMPLE_CSV_HREF =
  "/samples/avandar-sample-people-served.csv";

/**
 * The `first_dashboard` tutorial: four milestones, thirteen tooltips, in chunks
 * of 3, 2, 4 and 4. The first `build_dashboard` tooltip is omitted when the
 * explorer already has query results.
 *
 * Pure data, so it is unit-testable and so a second tutorial is a second file
 * rather than a refactor. Copy uses `msg` descriptors rather than `t` because
 * this module has no React context to resolve them in;
 * `makeJoyrideStepsFromMilestone` resolves them when building Joyride steps.
 *
 * No step is spent on navigation. The checklist panel routes to a milestone's
 * `route` when its row is clicked, and arrival tooltips name their location in
 * copy instead.
 */
export const FIRST_DASHBOARD_MILESTONES: readonly NuxMilestone[] = [
  {
    key: "add_dataset",
    title: msg`Add your first dataset`,
    summary: msg`Bring a spreadsheet into Avandar.`,
    route: { kind: "data_import" },
    completionEvent: "dataset.saved",
    steps: [
      {
        anchor: NuxAnchors.ids.datasetUploadForm,
        spotlightPadding: { top: 0, right: 12, bottom: 30, left: 12 },
        title: msg`Start with a spreadsheet`,
        body: msg`Welcome to your data source manager. Pick a CSV or Excel file from your computer. No spreadsheet handy? <0>Download our sample</0> and use that.`,
        placement: "right",
        bodyLinkHref: FIRST_DASHBOARD_SAMPLE_CSV_HREF,
        disableNextUntilAnchor: NuxAnchors.ids.datasetImportForm,
        targetWaitTimeoutMs: AWAIT_USER_ACTION_MS,
      },
      {
        anchor: NuxAnchors.ids.datasetImportForm,
        title: msg`Save it`,
        body: msg`Avandar read your file and already figured out what each column contains. Give the dataset a name, then save.`,
        spotlightPadding: { top: 0, right: 16, bottom: 24, left: 16 },
        placement: "left",
        // Data Sources scrolls a nested pane to the form and ignores
        // spotlightPadding. This leaves the upload field's label in view.
        scrollOffset: 120,
        disableNextUntilEvent: "dataset.saved",
        targetWaitTimeoutMs: AWAIT_USER_ACTION_MS,
        hideBack: true,
      },
      {
        anchor: NuxAnchors.ids.datasetSummaryTab,
        title: msg`Your data is summarized`,
        spotlightPadding: { top: 12, right: 8, bottom: 14, left: 8 },
        body: msg`Here you can see a full statistical profile of your data: ranges, distributions, and what's missing.`,
        placement: "bottom",
        disableNextUntilEvent: "dataset.summaryOpened",
        targetWaitTimeoutMs: AWAIT_USER_ACTION_MS,
        scrollParentToTop: true,
        hideBack: true,
      },
    ],
  },
  {
    key: "run_query",
    title: msg`Ask your first question`,
    summary: msg`Get an answer out of the data you just added.`,
    route: { kind: "data_explorer" },
    completionEvent: "query.succeeded",
    prerequisites: ["add_dataset"],
    steps: [
      {
        anchor: NuxAnchors.ids.chatComposer,
        title: msg`Just ask`,
        body: msg`This is the data explorer. Ask a question in your own words, like "how many people were served by our programs".`,
        placement: "top",
        openChatPanel: true,
        disableNextUntilEvent: "query.succeeded",
        targetWaitTimeoutMs: AWAIT_USER_ACTION_MS,
      },
      {
        anchor: NuxAnchors.ids.explorerCanvasTooltip,
        spotlightAnchor: NuxAnchors.ids.explorerCanvas,
        title: msg`There's your answer`,
        body: msg`Avandar turns your question into a query to show you the answers.`,
        placement: "bottom",
        targetWaitTimeoutMs: AWAIT_USER_ACTION_MS,
        hideBack: true,
        hideCaret: true,
      },
    ],
  },
  {
    key: "build_dashboard",
    title: msg`Build your first dashboard`,
    summary: msg`Keep that chart somewhere you can come back to.`,
    route: { kind: "data_explorer" },
    completionEvent: "dashboard.created",
    prerequisites: ["run_query"],
    steps: [
      {
        anchor: NuxAnchors.ids.chatComposer,
        title: msg`Run a query first`,
        body: msg`You can't save to a dashboard until you've run a query.`,
        placement: "top",
        openChatPanel: true,
        when: "explorerHasNoQueryResults",
        disableNextUntilEvent: "query.succeeded",
        targetWaitTimeoutMs: AWAIT_USER_ACTION_MS,
      },
      {
        anchor: NuxAnchors.ids.explorerSaveMenu,
        title: msg`Let's save your results now`,
        body: msg`Click "Save" to open the menu.`,
        placement: "bottom",
        disableNextUntilAnchor: NuxAnchors.ids.explorerSaveToDashboardItem,
        targetWaitTimeoutMs: AWAIT_USER_ACTION_MS,
      },
      {
        anchor: NuxAnchors.ids.explorerSaveToDashboardItem,
        title: msg`Let's move these results to a dashboard`,
        body: msg`Click "Save to dashboard".`,
        placement: "left",
        disableNextUntilAnchor: NuxAnchors.ids.explorerSaveToDashboardModal,
        targetWaitTimeoutMs: AWAIT_USER_ACTION_MS,
        spotlightPadding: { top: 42, right: 12, bottom: 18, left: 12 },
        hideBack: true,
      },
      {
        anchor: NuxAnchors.ids.explorerCreateDashboardButton,
        spotlightAnchor: NuxAnchors.ids.explorerSaveToDashboardModal,
        spotlightPadding: { top: 90, right: 40, bottom: 40, left: 40 },
        title: msg`Name it`,
        body: msg`Give the dashboard a name, then create it.`,
        placement: "top",
        disableNextUntilEvent: "dashboard.created",
        targetWaitTimeoutMs: AWAIT_USER_ACTION_MS,
        hideBack: true,
      },
    ],
  },
  {
    key: "share_dashboard",
    title: msg`Share it with your workspace`,
    summary: msg`Let your colleagues open what you just built.`,
    route: { kind: "dashboard_editor" },
    completionEvent: "dashboard.published",
    prerequisites: ["build_dashboard"],
    steps: [
      {
        anchor: NuxAnchors.ids.dashboardShareButton,
        title: msg`Let's let others see your dashboard`,
        body: msg`Your dashboard exists, but nobody else can open it yet. Let's choose who to share it with.`,
        placement: "bottom",
        disableNextUntilAnchor: NuxAnchors.ids.generalAccessSelect,
        targetWaitTimeoutMs: AWAIT_USER_ACTION_MS,
      },
      {
        anchor: NuxAnchors.ids.generalAccessSelect,
        title: msg`Choose who you want to share this with`,
        body: msg`You can choose to let everyone in your workspace see your dashboard, or only specific people, or even just for yourself. You can always change this whenever you want.`,
        placement: "bottom",
        hideBack: true,
        targetWaitTimeoutMs: AWAIT_USER_ACTION_MS,
      },
      {
        anchor: NuxAnchors.ids.shareRoleSelect,
        title: msg`Pick what they can do`,
        body: msg`Viewer lets people look at it. Editor lets them change it. Viewer is the safe default, and you can change anyone's role later.`,
        placement: "bottom",
        targetWaitTimeoutMs: AWAIT_USER_ACTION_MS,
        hideBack: true,
        when: "generalAccessIsWorkspace",
      },
      {
        anchor: NuxAnchors.ids.dashboardPublishButton,
        title: msg`Publish it`,
        body: msg`This is the last step. Publish, and anyone in your workspace can open this dashboard.`,
        placement: "top",
        hideBack: true,
        disableNextUntilEvent: "dashboard.published",
        targetWaitTimeoutMs: AWAIT_USER_ACTION_MS,
      },
    ],
  },
];

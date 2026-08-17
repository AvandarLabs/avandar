import { msg } from "@lingui/core/macro";
import { NuxAnchors } from "@/components/Nux/NuxAnchors/NuxAnchors";
import type { NuxMilestone } from "@/components/Nux/tutorials/NuxTutorial.types";

/**
 * How long a step waits for a target that only appears after the user does
 * something. The default 1000ms is right for a target already on the page and
 * far too short for one behind a file picker or a modal.
 */
const AWAIT_USER_ACTION_MS = 60_000;

/**
 * The `first_dashboard` tutorial: four milestones, ten tooltips, in chunks of
 * 3, 2, 2 and 3.
 *
 * Pure data, so it is unit-testable and so a second tutorial is a second file
 * rather than a refactor. Copy uses `msg` descriptors rather than `t` because
 * this module has no React context to resolve them in; `NuxTooltip` resolves
 * them with `i18n._()` at render.
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
        title: msg`Start with a spreadsheet`,
        body: msg`You're in Data Manager, Import. Pick a CSV or Excel file from your computer.`,
        placement: "right",
        showSampleDownload: true,
        targetWaitTimeoutMs: AWAIT_USER_ACTION_MS,
      },
      {
        anchor: NuxAnchors.ids.datasetImportForm,
        title: msg`Name it and save`,
        body: msg`Avandar already read your file and guessed what each column contains. Give the dataset a name, then save.`,
        placement: "top",
        targetWaitTimeoutMs: AWAIT_USER_ACTION_MS,
      },
      {
        // Points at the Data Summary TAB, not the profile behind it. This
        // page opens on Metadata, so the profile is not mounted when the
        // tutorial arrives, and a step anchored to it would sit out its
        // timeout waiting for an element that does not exist yet.
        anchor: NuxAnchors.ids.datasetSummaryTab,
        title: msg`It profiled your data for you`,
        body: msg`Open Data Summary to see what Avandar worked out on its own: ranges, distributions, and what's missing. You didn't have to ask.`,
        placement: "bottom",
        targetWaitTimeoutMs: AWAIT_USER_ACTION_MS,
      },
    ],
  },
  {
    key: "run_query",
    title: msg`Ask your first question`,
    summary: msg`Get an answer out of the data you just added.`,
    route: { kind: "data_explorer" },
    completionEvent: "query.succeeded",
    steps: [
      {
        anchor: NuxAnchors.ids.chatComposer,
        title: msg`Just ask`,
        body: msg`This is the Data Explorer, and this is Ava. Ask a question in plain English, like "total revenue by region".`,
        placement: "left",
        targetWaitTimeoutMs: AWAIT_USER_ACTION_MS,
      },
      {
        anchor: NuxAnchors.ids.explorerCanvas,
        title: msg`There's your answer`,
        body: msg`Ava wrote the SQL, ran it, and picked a chart to show it in.`,
        placement: "top",
        targetWaitTimeoutMs: AWAIT_USER_ACTION_MS,
      },
    ],
  },
  {
    key: "build_dashboard",
    title: msg`Build your first dashboard`,
    summary: msg`Keep that chart somewhere you can come back to.`,
    route: { kind: "data_explorer" },
    completionEvent: "dashboard.created",
    steps: [
      {
        anchor: NuxAnchors.ids.explorerVizTab,
        title: msg`Change the chart if you like`,
        body: msg`The Visualizations tab has the chart settings, if this isn't the shape you wanted.`,
        placement: "top",
      },
      {
        anchor: NuxAnchors.ids.explorerSaveMenu,
        title: msg`Save it to a dashboard`,
        body: msg`Open Save and choose "Save to dashboard". Name the dashboard, create it, and Avandar will take you there.`,
        placement: "bottom",
        targetWaitTimeoutMs: AWAIT_USER_ACTION_MS,
      },
    ],
  },
  {
    key: "share_dashboard",
    title: msg`Share it with your workspace`,
    summary: msg`Let your colleagues open what you just built.`,
    route: { kind: "dashboard_editor" },
    completionEvent: "dashboard.sharedToWorkspace",
    steps: [
      {
        anchor: NuxAnchors.ids.dashboardShareButton,
        title: msg`Only you can see this`,
        body: msg`Your dashboard exists, but nobody else can open it yet. Let's fix that.`,
        placement: "bottom",
        targetWaitTimeoutMs: AWAIT_USER_ACTION_MS,
      },
      {
        anchor: NuxAnchors.ids.generalAccessSelect,
        title: msg`Open it to your workspace`,
        body: msg`Workspace means everyone in your workspace, not the public. Nothing here creates a public link. And you can set it back to Private whenever you like.`,
        placement: "bottom",
        targetWaitTimeoutMs: AWAIT_USER_ACTION_MS,
      },
      {
        anchor: NuxAnchors.ids.shareRoleSelect,
        title: msg`Pick what they can do`,
        body: msg`Viewer lets people look at it. Editor lets them change it. Viewer is the safe default, and you can change anyone's role later.`,
        placement: "bottom",
        targetWaitTimeoutMs: AWAIT_USER_ACTION_MS,
      },
    ],
  },
];

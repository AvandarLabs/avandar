import type { Input } from "./ReleaseRepairObligations.schema";

/** Complete fictional input used only when input is omitted. */
export const DEFAULT_INPUT: Input = {
  artifact: { label: "Workshop guide", kind: "guide" },
  issues: [
    {
      id: "steps",
      label: "Missing setup steps",
      state: "resolved",
      releaseRole: "blocking",
      owner: "Rin",
      dueLabel: "Before sharing",
    },
    {
      id: "index",
      label: "Add an index",
      state: "open",
      releaseRole: "follow-up",
      owner: "Jo",
      dueLabel: "Next review",
    },
  ],
  recipientLabel: "Workshop team",
  labels: {
    ready: "Ready to share",
    held: "Held for blocker",
    limitations: "Known limitations",
    register: "Repair commitments",
    resolved: "Resolved",
    open: "Still open",
    example: "Fictional release decision",
  },
  showResolvedIssues: true,
  issueMarks: "tabs",
};

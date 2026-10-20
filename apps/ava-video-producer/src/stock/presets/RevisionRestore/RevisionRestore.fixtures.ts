import type { Input } from "./RevisionRestore.schema";
/** Complete fictional default input. */
export const DEFAULT_INPUT: Input = {
  revisions: [
    {
      id: "v1",
      label: "Draft A",
      content: ["Field notes", "Open questions"],
    },
    {
      id: "v2",
      label: "Draft B",
      content: ["Field notes", "Next steps"],
    },
    {
      id: "v3",
      label: "Draft C",
      content: ["Field summary", "Next steps"],
    },
  ],
  restoreRevisionId: "v1",
  artifactLabel: "Sample notes",
  statusLabels: {
    current: "Current",
    restored: "Earlier content restored",
    history: "Saved versions",
  },
  showVersionLabels: true,
  showChangedLines: true,
  showStorageDrawer: true,
  surface: "page",
};
/** Accepted minimum, crowded, changed, and toggle cases. */
export const FIXTURES: Array<{ id: string; input: Input }> = [
  {
    id: "default",
    input: {
      revisions: [
        {
          id: "v1",
          label: "Draft A",
          content: ["Field notes", "Open questions"],
        },
        {
          id: "v2",
          label: "Draft B",
          content: ["Field notes", "Next steps"],
        },
        {
          id: "v3",
          label: "Draft C",
          content: ["Field summary", "Next steps"],
        },
      ],
      restoreRevisionId: "v1",
      artifactLabel: "Sample notes",
      statusLabels: {
        current: "Current",
        restored: "Earlier content restored",
        history: "Saved versions",
      },
      showVersionLabels: true,
      showChangedLines: true,
      showStorageDrawer: true,
      surface: "page",
    },
  },
  {
    id: "minimum",
    input: {
      revisions: [
        {
          id: "",
          label: "A",
          content: ["A"],
        },
        {
          id: "空 間",
          label: "B",
          content: ["B"],
        },
      ],
      restoreRevisionId: "",
      artifactLabel: "Sample notes",
      statusLabels: {
        current: "Current",
        restored: "Earlier content restored",
        history: "Saved versions",
      },
      showVersionLabels: true,
      showChangedLines: true,
      showStorageDrawer: true,
      surface: "page",
    },
  },
  {
    id: "dense",
    input: {
      revisions: [
        {
          id: "v 0",
          label: "WWWWWWWWWWWWWWWWWW",
          content: ["WWWWWWWWWWWWWWWWWWWWWWWW", "WWWWWWWWWWWWWWWWWWWWWWWW"],
        },
        {
          id: "v 1",
          label: "WWWWWWWWWWWWWWWWWW",
          content: [
            "WWWWWWWWWWWWWWWWWWWWWWWW",
            "WWWWWWWWWWWWWWWWWWWWWWWW",
            "WWWWWWWWWWWWWWWWWWWWWWWW",
          ],
        },
        {
          id: "v 2",
          label: "WWWWWWWWWWWWWWWWWW",
          content: [
            "WWWWWWWWWWWWWWWWWWWWWWWW",
            "WWWWWWWWWWWWWWWWWWWWWWWW",
            "WWWWWWWWWWWWWWWWWWWWWWWW",
          ],
        },
        {
          id: "v 3",
          label: "WWWWWWWWWWWWWWWWWW",
          content: [
            "WWWWWWWWWWWWWWWWWWWWWWWW",
            "WWWWWWWWWWWWWWWWWWWWWWWW",
            "WWWWWWWWWWWWWWWWWWWWWWWW",
          ],
        },
      ],
      restoreRevisionId: "v 0",
      artifactLabel: "WWWWWWWWWWWWWWWWWWWWWWWW",
      statusLabels: {
        current: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        restored: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        history: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
      showVersionLabels: true,
      showChangedLines: true,
      showStorageDrawer: true,
      surface: "page",
    },
  },
  {
    id: "changed",
    input: {
      revisions: [
        {
          id: "v1",
          label: "Draft A",
          content: ["Field notes", "Open questions"],
        },
        {
          id: "v2",
          label: "Draft B",
          content: ["Field notes", "Next steps"],
        },
        {
          id: "v3",
          label: "Draft C",
          content: ["Field summary", "Next steps"],
        },
      ],
      restoreRevisionId: "v2",
      artifactLabel: "Sample notes",
      statusLabels: {
        current: "Current",
        restored: "Earlier content restored",
        history: "Saved versions",
      },
      showVersionLabels: false,
      showChangedLines: false,
      showStorageDrawer: false,
      surface: "slate",
    },
  },
];

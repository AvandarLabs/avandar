import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive serializable controls with exact accepted structural bounds. */
export const CONTROLS: StockControl[] = [
  {
    path: "revisions",
    help: {
      id: "motionAtlas.revision-restore.controls.revisions.help",
      message:
        "Ordered saved snapshots; the final snapshot supplies the initial current contents. 2..4 revisions; unique IDs <= 16 characters; labels 1..18 characters; each content has 1..3 lines of 1..24 characters; no separate revision count",
    },
    label: {
      id: "motionAtlas.revision-restore.controls.revisions",
      message: "revisions",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 4,
    itemSchema: {
      type: "object",
      additionalProperties: false,
      required: ["id", "label", "content"],
      properties: {
        id: {
          type: "string",
          minLength: 0,
          maxLength: 16,
        },
        label: {
          type: "string",
          minLength: 1,
          maxLength: 18,
        },
        content: {
          type: "array",
          minItems: 1,
          maxItems: 3,
          items: {
            type: "string",
            minLength: 1,
            maxLength: 24,
          },
        },
      },
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.revision-restore.controls.id",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 16,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.revision-restore.controls.label",
          message: "label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 18,
      },
      {
        path: "content",
        label: {
          id: "motionAtlas.revision-restore.controls.content",
          message: "content",
        },
        kind: "collection",
        minItems: 1,
        maxItems: 3,
        itemSchema: {
          type: "string",
          minLength: 1,
          maxLength: 24,
        },
        itemControls: [
          {
            path: "",
            label: {
              id: "motionAtlas.revision-restore.controls.value",
              message: "value",
            },
            kind: "text",
            minLength: 1,
            maxLength: 24,
          },
        ],
      },
    ],
  },
  {
    path: "restoreRevisionId",
    help: {
      id: "motionAtlas.revision-restore.controls.restoreRevisionId.help",
      message:
        "Selects the saved snapshot whose contents replace the current artifact. Must match a revisions ID other than the final entry; selected content must differ from final content",
    },
    label: {
      id: "motionAtlas.revision-restore.controls.restoreRevisionId",
      message: "restoreRevisionId",
    },
    kind: "select",
    optionsFrom: {
      path: "revisions",
      valueKey: "id",
      labelKey: "label",
    },
  },
  {
    path: "artifactLabel",
    help: {
      id: "motionAtlas.revision-restore.controls.artifactLabel.help",
      message:
        "Names the current artifact above the history rail. 1..24 characters",
    },
    label: {
      id: "motionAtlas.revision-restore.controls.artifactLabel",
      message: "artifactLabel",
    },
    kind: "text",
    minLength: 1,
    maxLength: 24,
  },
  {
    path: "statusLabels",
    help: {
      id: "motionAtlas.revision-restore.controls.statusLabels.help",
      message:
        "Supplies the labels for the initial state, restored state, and retained history. All three keys required; each label 1..28 characters",
    },
    label: {
      id: "motionAtlas.revision-restore.controls.statusLabels",
      message: "statusLabels",
    },
    kind: "object",
    controls: [
      {
        path: "current",
        label: {
          id: "motionAtlas.revision-restore.controls.current",
          message: "current",
        },
        kind: "text",
        minLength: 1,
        maxLength: 28,
      },
      {
        path: "restored",
        label: {
          id: "motionAtlas.revision-restore.controls.restored",
          message: "restored",
        },
        kind: "text",
        minLength: 1,
        maxLength: 28,
      },
      {
        path: "history",
        label: {
          id: "motionAtlas.revision-restore.controls.history",
          message: "history",
        },
        kind: "text",
        minLength: 1,
        maxLength: 28,
      },
    ],
  },
  {
    path: "showVersionLabels",
    help: {
      id: "motionAtlas.revision-restore.controls.showVersionLabels.help",
      message: "Displays the supplied labels beneath saved snapshots. boolean",
    },
    label: {
      id: "motionAtlas.revision-restore.controls.showVersionLabels",
      message: "showVersionLabels",
    },
    kind: "boolean",
  },
  {
    path: "showChangedLines",
    help: {
      id: "motionAtlas.revision-restore.controls.showChangedLines.help",
      message:
        "Briefly marks current line positions whose text differs from the restored snapshot. boolean; line comparisons are positional, not a semantic text diff",
    },
    label: {
      id: "motionAtlas.revision-restore.controls.showChangedLines",
      message: "showChangedLines",
    },
    kind: "boolean",
  },
  {
    path: "showStorageDrawer",
    help: {
      id: "motionAtlas.revision-restore.controls.showStorageDrawer.help",
      message:
        "Show the local drawer around the stored impression. When false, keep the stored impression in a labeled margin recess. boolean",
    },
    label: {
      id: "motionAtlas.revision-restore.controls.showStorageDrawer",
      message: "showStorageDrawer",
    },
    kind: "boolean",
  },
  {
    path: "surface",
    help: {
      id: "motionAtlas.revision-restore.controls.surface.help",
      message:
        "Use a paper page or writing slate while preserving the same stored-impression restoration action. One of page, slate",
    },
    label: {
      id: "motionAtlas.revision-restore.controls.surface",
      message: "surface",
    },
    kind: "select",
    options: [
      {
        value: "page",
        label: {
          id: "motionAtlas.revision-restore.options.page",
          message: "page",
        },
      },
      {
        value: "slate",
        label: {
          id: "motionAtlas.revision-restore.options.slate",
          message: "slate",
        },
      },
    ],
  },
];

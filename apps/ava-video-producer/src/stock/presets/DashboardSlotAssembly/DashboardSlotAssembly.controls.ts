import type { StockControl } from "../../contracts/StockContract.types";

/** Recursive serializable controls retain exact accepted bounds. */
export const CONTROLS: StockControl[] = [
  {
    path: "boardTitle",
    label: {
      id: "motionAtlas.dashboard-slot-assembly.controls.boardTitle",
      message: "boardTitle",
    },
    kind: "text",
    minLength: 1,
    maxLength: 48,
    help: {
      id: "motionAtlas.dashboard-slot-assembly.controls.boardTitle.help",
      message: "Title of the assembled board.",
    },
  },
  {
    path: "widgets",
    label: {
      id: "motionAtlas.dashboard-slot-assembly.controls.widgets",
      message: "widgets",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 4,
    itemSchema: {
      type: "object",
      additionalProperties: false,
      required: ["id", "title", "kind", "lines"],
      properties: {
        id: {
          type: "string",
          minLength: 0,
          maxLength: 20,
        },
        title: {
          type: "string",
          minLength: 0,
          maxLength: 28,
        },
        kind: {
          type: "string",
          enum: ["value", "list", "note"],
        },
        lines: {
          type: "array",
          minItems: 1,
          maxItems: 3,
          items: {
            type: "string",
            minLength: 0,
            maxLength: 38,
          },
        },
      },
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.dashboard-slot-assembly.controls.id",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 20,
      },
      {
        path: "title",
        label: {
          id: "motionAtlas.dashboard-slot-assembly.controls.title",
          message: "title",
        },
        kind: "text",
        minLength: 0,
        maxLength: 28,
      },
      {
        path: "kind",
        label: {
          id: "motionAtlas.dashboard-slot-assembly.controls.kind",
          message: "kind",
        },
        kind: "select",
        options: [
          {
            value: "value",
            label: {
              id: "motionAtlas.dashboard-slot-assembly.controls.kind.value",
              message: "value",
            },
          },
          {
            value: "list",
            label: {
              id: "motionAtlas.dashboard-slot-assembly.controls.kind.list",
              message: "list",
            },
          },
          {
            value: "note",
            label: {
              id: "motionAtlas.dashboard-slot-assembly.controls.kind.note",
              message: "note",
            },
          },
        ],
      },
      {
        path: "lines",
        label: {
          id: "motionAtlas.dashboard-slot-assembly.controls.lines",
          message: "lines",
        },
        kind: "collection",
        minItems: 1,
        maxItems: 3,
        itemSchema: {
          type: "string",
          minLength: 0,
          maxLength: 38,
        },
        itemControls: [
          {
            path: "",
            label: {
              id: "motionAtlas.dashboard-slot-assembly.controls.lines",
              message: "lines",
            },
            kind: "text",
            minLength: 0,
            maxLength: 38,
          },
        ],
      },
    ],
    help: {
      id: "motionAtlas.dashboard-slot-assembly.controls.widgets.help",
      message:
        "Panel content and number of visible panels. Value panels use one line, lists use separate rows, and notes use wrapped text.",
    },
  },
  {
    path: "featuredWidgetId",
    label: {
      id: "motionAtlas.dashboard-slot-assembly.controls.featuredWidgetId",
      message: "featuredWidgetId",
    },
    kind: "select",
    optionsFrom: {
      path: "widgets",
      valueKey: "id",
      labelKey: "title",
      scope: "root",
    },
    help: {
      id: "motionAtlas.dashboard-slot-assembly.controls.featuredWidgetId.help",
      message: "Widget occupying the large slot.",
    },
  },
  {
    path: "layout",
    label: {
      id: "motionAtlas.dashboard-slot-assembly.controls.layout",
      message: "layout",
    },
    kind: "select",
    options: [
      {
        value: "feature-left",
        label: {
          id: "motionAtlas.dashboard-slot-assembly.controls.layout.feature-left",
          message: "feature-left",
        },
      },
      {
        value: "feature-top",
        label: {
          id: "motionAtlas.dashboard-slot-assembly.controls.layout.feature-top",
          message: "feature-top",
        },
      },
    ],
    help: {
      id: "motionAtlas.dashboard-slot-assembly.controls.layout.help",
      message: "Final dashboard geometry and docking order.",
    },
  },
  {
    path: "scopeLabel",
    label: {
      id: "motionAtlas.dashboard-slot-assembly.controls.scopeLabel",
      message: "scopeLabel",
    },
    kind: "text",
    minLength: 0,
    maxLength: 36,
    help: {
      id: "motionAtlas.dashboard-slot-assembly.controls.scopeLabel.help",
      message: "Editable shared context strip above all panels.",
    },
  },
  {
    path: "showGuides",
    label: {
      id: "motionAtlas.dashboard-slot-assembly.controls.showGuides",
      message: "showGuides",
    },
    kind: "boolean",
    help: {
      id: "motionAtlas.dashboard-slot-assembly.controls.showGuides.help",
      message: "Display temporary alignment guides while panels dock.",
    },
  },
];

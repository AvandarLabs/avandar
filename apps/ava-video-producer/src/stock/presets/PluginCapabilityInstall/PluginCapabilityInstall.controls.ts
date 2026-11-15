import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive serializable bounded authoring controls. */
export const CONTROLS: StockControl[] = [
  {
    path: "records",
    label: {
      id: "motionAtlas.plugin-capability-install.controls.records.label",
      message: "Records",
    },
    kind: "collection",
    minItems: 1,
    maxItems: 8,
    itemSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          minLength: 1,
          maxLength: 16,
        },
        categoryId: {
          type: "string",
          minLength: 1,
          maxLength: 16,
        },
      },
      required: ["id", "categoryId"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.plugin-capability-install.controls.records.item.id.label",
          message: "Id",
        },
        kind: "text",
        minLength: 1,
        maxLength: 16,
      },
      {
        path: "categoryId",
        label: {
          id: "motionAtlas.plugin-capability-install.controls.records.item.categoryId.label",
          message: "Category id",
        },
        kind: "select",
        optionsFrom: {
          path: "categories",
          valueKey: "id",
          labelKey: "label",
          scope: "root",
        },
      },
    ],
    help: {
      id: "motionAtlas.plugin-capability-install.controls.records.help",
      message:
        "Small fictional records counted by the illustrated utility after installation. 1..8 items; unique IDs 1..16 characters; categoryId must reference categories; each record contributes exactly one count",
    },
  },
  {
    path: "categories",
    label: {
      id: "motionAtlas.plugin-capability-install.controls.categories.label",
      message: "Categories",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 3,
    itemSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          minLength: 1,
          maxLength: 16,
        },
        label: {
          type: "string",
          minLength: 1,
          maxLength: 18,
        },
      },
      required: ["id", "label"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.plugin-capability-install.controls.categories.item.id.label",
          message: "Id",
        },
        kind: "text",
        minLength: 1,
        maxLength: 16,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.plugin-capability-install.controls.categories.item.label.label",
          message: "Label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 18,
      },
    ],
    help: {
      id: "motionAtlas.plugin-capability-install.controls.categories.help",
      message:
        "Category labels and display order, including a category with no records if supplied. 2..3 items; unique IDs 1..16 characters; labels 1..18 characters; zero-count categories remain labeled",
    },
  },
  {
    path: "utility",
    label: {
      id: "motionAtlas.plugin-capability-install.controls.utility.label",
      message: "Utility",
    },
    kind: "object",
    controls: [
      {
        path: "label",
        label: {
          id: "motionAtlas.plugin-capability-install.controls.utility.label.label",
          message: "Label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 26,
      },
      {
        path: "fieldLabel",
        label: {
          id: "motionAtlas.plugin-capability-install.controls.utility.fieldLabel.label",
          message: "Field label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 26,
      },
      {
        path: "operationLabel",
        label: {
          id: "motionAtlas.plugin-capability-install.controls.utility.operationLabel.label",
          message: "Operation label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 26,
      },
    ],
    help: {
      id: "motionAtlas.plugin-capability-install.controls.utility.help",
      message:
        "Names the optional utility and its fixed count-by-category operation. All keys required; labels 1..26 characters; operationLabel must describe counting supplied records by category, not an arbitrary executable operation",
    },
  },
  {
    path: "installation",
    label: {
      id: "motionAtlas.plugin-capability-install.controls.installation.label",
      message: "Installation",
    },
    kind: "object",
    controls: [
      {
        path: "choice",
        label: {
          id: "motionAtlas.plugin-capability-install.controls.installation.choice.label",
          message: "Choice",
        },
        kind: "select",
        options: [
          {
            value: "install",
            label: {
              id: "motionAtlas.plugin-capability-install.controls.installation.choice.install",
              message: "install",
            },
          },
          {
            value: "defer",
            label: {
              id: "motionAtlas.plugin-capability-install.controls.installation.choice.defer",
              message: "defer",
            },
          },
        ],
      },
      {
        path: "decisionLabel",
        label: {
          id: "motionAtlas.plugin-capability-install.controls.installation.decisionLabel.label",
          message: "Decision label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
    ],
    help: {
      id: "motionAtlas.plugin-capability-install.controls.installation.help",
      message:
        "Authored human decision controlling whether the capability becomes available. choice install or defer; decisionLabel 1..32 characters and consistent with choice; no automatic install",
    },
  },
  {
    path: "copy",
    label: {
      id: "motionAtlas.plugin-capability-install.controls.copy.label",
      message: "Copy",
    },
    kind: "object",
    controls: [
      {
        path: "workspace",
        label: {
          id: "motionAtlas.plugin-capability-install.controls.copy.workspace.label",
          message: "Workspace",
        },
        kind: "text",
        minLength: 1,
        maxLength: 36,
      },
      {
        path: "records",
        label: {
          id: "motionAtlas.plugin-capability-install.controls.copy.records.label",
          message: "Records",
        },
        kind: "text",
        minLength: 1,
        maxLength: 36,
      },
      {
        path: "emptySocket",
        label: {
          id: "motionAtlas.plugin-capability-install.controls.copy.emptySocket.label",
          message: "Empty socket",
        },
        kind: "text",
        minLength: 1,
        maxLength: 36,
      },
      {
        path: "installed",
        label: {
          id: "motionAtlas.plugin-capability-install.controls.copy.installed.label",
          message: "Installed",
        },
        kind: "text",
        minLength: 1,
        maxLength: 36,
      },
      {
        path: "deferred",
        label: {
          id: "motionAtlas.plugin-capability-install.controls.copy.deferred.label",
          message: "Deferred",
        },
        kind: "text",
        minLength: 1,
        maxLength: 36,
      },
      {
        path: "result",
        label: {
          id: "motionAtlas.plugin-capability-install.controls.copy.result.label",
          message: "Result",
        },
        kind: "text",
        minLength: 1,
        maxLength: 36,
      },
      {
        path: "example",
        label: {
          id: "motionAtlas.plugin-capability-install.controls.copy.example.label",
          message: "Example",
        },
        kind: "text",
        minLength: 1,
        maxLength: 36,
      },
    ],
    help: {
      id: "motionAtlas.plugin-capability-install.controls.copy.help",
      message:
        "Every workspace, status, result, and example caption. All keys required; each string 1..36 characters; result must describe record counts",
    },
  },
  {
    path: "showRecordIds",
    label: {
      id: "motionAtlas.plugin-capability-install.controls.showRecordIds.label",
      message: "Show record ids",
    },
    kind: "boolean",
    help: {
      id: "motionAtlas.plugin-capability-install.controls.showRecordIds.help",
      message:
        "Shows record IDs on the retained strip while each record becomes a tally mark. boolean; each underlying record and category membership remains unchanged",
    },
  },
];

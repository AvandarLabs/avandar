import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive serializable bounded authoring controls. */
export const CONTROLS: StockControl[] = [
  {
    path: "existingResources",
    label: {
      id: "motionAtlas.workspace-capacity-extension.controls.existingResources.label",
      message: "Existing resources",
    },
    kind: "collection",
    minItems: 1,
    maxItems: 6,
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
          maxLength: 20,
        },
      },
      required: ["id", "label"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.workspace-capacity-extension.controls.existingResources.item.id.label",
          message: "Id",
        },
        kind: "text",
        minLength: 1,
        maxLength: 16,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.workspace-capacity-extension.controls.existingResources.item.label.label",
          message: "Label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 20,
      },
    ],
    help: {
      id: "motionAtlas.workspace-capacity-extension.controls.existingResources.help",
      message:
        "The resources already inside the current workspace. 1..6 items; unique IDs 1..16 characters across both resource collections; labels 1..20 characters; length cannot exceed allowances.currentAllowance.limit",
    },
  },
  {
    path: "requestedResources",
    label: {
      id: "motionAtlas.workspace-capacity-extension.controls.requestedResources.label",
      message: "Requested resources",
    },
    kind: "collection",
    minItems: 1,
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
          maxLength: 20,
        },
      },
      required: ["id", "label"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.workspace-capacity-extension.controls.requestedResources.item.id.label",
          message: "Id",
        },
        kind: "text",
        minLength: 1,
        maxLength: 16,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.workspace-capacity-extension.controls.requestedResources.item.label.label",
          message: "Label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 20,
      },
    ],
    help: {
      id: "motionAtlas.workspace-capacity-extension.controls.requestedResources.help",
      message:
        "Additional authored requests that remain pending unless the expanded allowance is chosen. 1..3 items; unique IDs 1..16 characters across both resource collections; labels 1..20 characters; combined resource count must exceed allowances.currentAllowance.limit and not exceed allowances.expandedAllowance.limit",
    },
  },
  {
    path: "allowances",
    label: {
      id: "motionAtlas.workspace-capacity-extension.controls.allowances.label",
      message: "Allowances",
    },
    kind: "object",
    controls: [
      {
        path: "currentAllowance",
        label: {
          id: "motionAtlas.workspace-capacity-extension.controls.allowances.currentAllowance.label",
          message: "Current allowance",
        },
        kind: "object",
        controls: [
          {
            path: "label",
            label: {
              id: "motionAtlas.workspace-capacity-extension.controls.allowances.currentAllowance.label.label",
              message: "Label",
            },
            kind: "text",
            minLength: 1,
            maxLength: 28,
          },
          {
            path: "limit",
            label: {
              id: "motionAtlas.workspace-capacity-extension.controls.allowances.currentAllowance.limit.label",
              message: "Limit",
            },
            kind: "number",
            min: 1,
            max: 9,
            step: 1,
          },
        ],
      },
      {
        path: "expandedAllowance",
        label: {
          id: "motionAtlas.workspace-capacity-extension.controls.allowances.expandedAllowance.label",
          message: "Expanded allowance",
        },
        kind: "object",
        controls: [
          {
            path: "label",
            label: {
              id: "motionAtlas.workspace-capacity-extension.controls.allowances.expandedAllowance.label.label",
              message: "Label",
            },
            kind: "text",
            minLength: 1,
            maxLength: 28,
          },
          {
            path: "limit",
            label: {
              id: "motionAtlas.workspace-capacity-extension.controls.allowances.expandedAllowance.limit.label",
              message: "Limit",
            },
            kind: "number",
            min: 1,
            max: 9,
            step: 1,
          },
        ],
      },
    ],
    help: {
      id: "motionAtlas.workspace-capacity-extension.controls.allowances.help",
      message:
        "Two explicit resource-slot allowances. These are capacities, not independent claims about the number of connected datasets. All keys required; labels 1..28 characters; integer limits 1..9; expanded limit strictly greater than current limit; actual resource counts derive only from the collections",
    },
  },
  {
    path: "choice",
    label: {
      id: "motionAtlas.workspace-capacity-extension.controls.choice.label",
      message: "Choice",
    },
    kind: "object",
    controls: [
      {
        path: "decision",
        label: {
          id: "motionAtlas.workspace-capacity-extension.controls.choice.decision.label",
          message: "Decision",
        },
        kind: "select",
        options: [
          {
            value: "expand",
            label: {
              id: "motionAtlas.workspace-capacity-extension.controls.choice.decision.expand",
              message: "expand",
            },
          },
          {
            value: "keep",
            label: {
              id: "motionAtlas.workspace-capacity-extension.controls.choice.decision.keep",
              message: "keep",
            },
          },
        ],
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.workspace-capacity-extension.controls.choice.label.label",
          message: "Label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 36,
      },
    ],
    help: {
      id: "motionAtlas.workspace-capacity-extension.controls.choice.help",
      message:
        "The human authorization controlling the boundary change. decision expand or keep; label 1..36 characters and consistent with decision; no timer, usage threshold, or animation event authorizes an upgrade by itself",
    },
  },
  {
    path: "copy",
    label: {
      id: "motionAtlas.workspace-capacity-extension.controls.copy.label",
      message: "Copy",
    },
    kind: "object",
    controls: [
      {
        path: "workspace",
        label: {
          id: "motionAtlas.workspace-capacity-extension.controls.copy.workspace.label",
          message: "Workspace",
        },
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "pending",
        label: {
          id: "motionAtlas.workspace-capacity-extension.controls.copy.pending.label",
          message: "Pending",
        },
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "capacity",
        label: {
          id: "motionAtlas.workspace-capacity-extension.controls.copy.capacity.label",
          message: "Capacity",
        },
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "retained",
        label: {
          id: "motionAtlas.workspace-capacity-extension.controls.copy.retained.label",
          message: "Retained",
        },
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "example",
        label: {
          id: "motionAtlas.workspace-capacity-extension.controls.copy.example.label",
          message: "Example",
        },
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
    ],
    help: {
      id: "motionAtlas.workspace-capacity-extension.controls.copy.help",
      message:
        "All framing and evidence labels. All keys required; each string 1..42 characters; example retains a fictional qualifier",
    },
  },
  {
    path: "showResourceLabels",
    label: {
      id: "motionAtlas.workspace-capacity-extension.controls.showResourceLabels.label",
      message: "Show resource labels",
    },
    kind: "boolean",
    help: {
      id: "motionAtlas.workspace-capacity-extension.controls.showResourceLabels.help",
      message:
        "Shows resource names on the persistent tabs. boolean; hiding names does not change IDs, counts, pending status, or the selected allowance",
    },
  },
];

import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable recursive controls preserve literal accepted field bounds. */
export const CONTROLS: StockControl[] = [
  {
    path: "patches",
    label: {
      id: "motionAtlas.habitat-corridor-reconnection.controls.patches",
      message: "patches",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 2,
    itemSchema: {
      type: "object",
      properties: {
        id: { type: "string", minLength: 0, maxLength: 20 },
        label: { type: "string", minLength: 0, maxLength: 24 },
        areaHa: { type: "number", exclusiveMinimum: 0, maximum: 10000 },
      },
      required: ["id", "label", "areaHa"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.habitat-corridor-reconnection.controls.patches.id",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 20,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.habitat-corridor-reconnection.controls.patches.label",
          message: "label",
        },
        kind: "text",
        minLength: 0,
        maxLength: 24,
      },
      {
        path: "areaHa",
        label: {
          id: "motionAtlas.habitat-corridor-reconnection.controls.patches.areaHa",
          message: "areaHa",
        },
        kind: "number",
        min: 0,
        max: 10000,
      },
    ],
    help: {
      id: "motionAtlas.habitat-corridor-reconnection.controls.patches.help",
      message:
        "Define the two habitat patches on either side of the barrier. Exactly 2 patches; unique IDs <= 20 characters; labels <= 24; each area > 0 and <= 10000 ha. Array owns patch count.",
    },
  },
  {
    path: "corridor",
    label: {
      id: "motionAtlas.habitat-corridor-reconnection.controls.corridor",
      message: "corridor",
    },
    kind: "object",
    controls: [
      {
        path: "label",
        label: {
          id: "motionAtlas.habitat-corridor-reconnection.controls.corridor.label",
          message: "label",
        },
        kind: "text",
        minLength: 0,
        maxLength: 32,
      },
      {
        path: "lengthM",
        label: {
          id: "motionAtlas.habitat-corridor-reconnection.controls.corridor.lengthM",
          message: "lengthM",
        },
        kind: "number",
        min: 0,
        max: 10000,
      },
      {
        path: "widthM",
        label: {
          id: "motionAtlas.habitat-corridor-reconnection.controls.corridor.widthM",
          message: "widthM",
        },
        kind: "number",
        min: 0,
        max: 10000,
      },
      {
        path: "fromPatchId",
        label: {
          id: "motionAtlas.habitat-corridor-reconnection.controls.corridor.fromPatchId",
          message: "fromPatchId",
        },
        kind: "select",
        optionsFrom: { path: "patches", valueKey: "id", labelKey: "label" },
      },
      {
        path: "toPatchId",
        label: {
          id: "motionAtlas.habitat-corridor-reconnection.controls.corridor.toPatchId",
          message: "toPatchId",
        },
        kind: "select",
        optionsFrom: { path: "patches", valueKey: "id", labelKey: "label" },
      },
    ],
    help: {
      id: "motionAtlas.habitat-corridor-reconnection.controls.corridor.help",
      message:
        "Define the new nonoverlapping strip and its endpoint patches. Label <= 32 characters; length and width > 0 and <= 10000 m; different existing endpoint IDs. New area = length * width / 10000 ha; dimensions describe a rectangular accounting footprint.",
    },
  },
  {
    path: "landBoundaryHa",
    label: {
      id: "motionAtlas.habitat-corridor-reconnection.controls.landBoundaryHa",
      message: "landBoundaryHa",
    },
    kind: "number",
    min: 0,
    max: 100000,
    help: {
      id: "motionAtlas.habitat-corridor-reconnection.controls.landBoundaryHa.help",
      message:
        "Set the unchanged area of the schematic land-use boundary. Greater than or equal to patch area sum plus corridor area and <= 100000 ha. Corridor land is reclassified from the remaining other-land area, never added to the map total.",
    },
  },
  {
    path: "decision",
    label: {
      id: "motionAtlas.habitat-corridor-reconnection.controls.decision",
      message: "decision",
    },
    kind: "object",
    controls: [
      {
        path: "actorLabel",
        label: {
          id: "motionAtlas.habitat-corridor-reconnection.controls.decision.actorLabel",
          message: "actorLabel",
        },
        kind: "text",
        minLength: 1,
        maxLength: 34,
      },
      {
        path: "actionLabel",
        label: {
          id: "motionAtlas.habitat-corridor-reconnection.controls.decision.actionLabel",
          message: "actionLabel",
        },
        kind: "text",
        minLength: 1,
        maxLength: 34,
      },
      {
        path: "stage",
        label: {
          id: "motionAtlas.habitat-corridor-reconnection.controls.decision.stage",
          message: "stage",
        },
        kind: "select",
        options: [
          {
            value: "proposal",
            label: {
              id: "motionAtlas.habitat-corridor-reconnection.options.decision.stage.proposal",
              message: "proposal",
            },
          },
          {
            value: "implemented",
            label: {
              id: "motionAtlas.habitat-corridor-reconnection.options.decision.stage.implemented",
              message: "implemented",
            },
          },
        ],
      },
    ],
    help: {
      id: "motionAtlas.habitat-corridor-reconnection.controls.decision.help",
      message:
        "Name the implementation decision and whether its footprint is proposed or implemented. Actor/action 1..34 characters; enum stage. Proposed route remains outlined; implemented route is solid. Status is authored content, not certification.",
    },
  },
  {
    path: "showIllustrativeTraversal",
    label: {
      id: "motionAtlas.habitat-corridor-reconnection.controls.showIllustrativeTraversal",
      message: "showIllustrativeTraversal",
    },
    kind: "boolean",
    help: {
      id: "motionAtlas.habitat-corridor-reconnection.controls.showIllustrativeTraversal.help",
      message:
        "Optionally move a neutral marker along the designed connection. Boolean. If true, the illustrative-traversal caption stays visible; the marker is not an animal count or observed movement record.",
    },
  },
  {
    path: "showLandBalance",
    label: {
      id: "motionAtlas.habitat-corridor-reconnection.controls.showLandBalance",
      message: "showLandBalance",
    },
    kind: "boolean",
    help: {
      id: "motionAtlas.habitat-corridor-reconnection.controls.showLandBalance.help",
      message:
        "Show habitat and other land summing to the fixed boundary area. Boolean; both before and after values derive from patches, corridor dimensions and boundary.",
    },
  },
  {
    path: "copy",
    label: {
      id: "motionAtlas.habitat-corridor-reconnection.controls.copy",
      message: "copy",
    },
    kind: "object",
    controls: [
      {
        path: "map",
        label: {
          id: "motionAtlas.habitat-corridor-reconnection.controls.copy.map",
          message: "map",
        },
        kind: "text",
        minLength: 0,
        maxLength: 28,
      },
      {
        path: "barrier",
        label: {
          id: "motionAtlas.habitat-corridor-reconnection.controls.copy.barrier",
          message: "barrier",
        },
        kind: "text",
        minLength: 0,
        maxLength: 28,
      },
      {
        path: "crossing",
        label: {
          id: "motionAtlas.habitat-corridor-reconnection.controls.copy.crossing",
          message: "crossing",
        },
        kind: "text",
        minLength: 0,
        maxLength: 28,
      },
      {
        path: "habitat",
        label: {
          id: "motionAtlas.habitat-corridor-reconnection.controls.copy.habitat",
          message: "habitat",
        },
        kind: "text",
        minLength: 0,
        maxLength: 28,
      },
      {
        path: "otherLand",
        label: {
          id: "motionAtlas.habitat-corridor-reconnection.controls.copy.otherLand",
          message: "otherLand",
        },
        kind: "text",
        minLength: 0,
        maxLength: 28,
      },
      {
        path: "proposal",
        label: {
          id: "motionAtlas.habitat-corridor-reconnection.controls.copy.proposal",
          message: "proposal",
        },
        kind: "text",
        minLength: 0,
        maxLength: 28,
      },
      {
        path: "implemented",
        label: {
          id: "motionAtlas.habitat-corridor-reconnection.controls.copy.implemented",
          message: "implemented",
        },
        kind: "text",
        minLength: 0,
        maxLength: 28,
      },
      {
        path: "traversal",
        label: {
          id: "motionAtlas.habitat-corridor-reconnection.controls.copy.traversal",
          message: "traversal",
        },
        kind: "text",
        minLength: 0,
        maxLength: 28,
      },
      {
        path: "areaUnit",
        label: {
          id: "motionAtlas.habitat-corridor-reconnection.controls.copy.areaUnit",
          message: "areaUnit",
        },
        kind: "text",
        minLength: 0,
        maxLength: 8,
      },
      {
        path: "lengthUnit",
        label: {
          id: "motionAtlas.habitat-corridor-reconnection.controls.copy.lengthUnit",
          message: "lengthUnit",
        },
        kind: "text",
        minLength: 0,
        maxLength: 8,
      },
      {
        path: "disclaimer",
        label: {
          id: "motionAtlas.habitat-corridor-reconnection.controls.copy.disclaimer",
          message: "disclaimer",
        },
        kind: "text",
        minLength: 0,
        maxLength: 54,
      },
    ],
    help: {
      id: "motionAtlas.habitat-corridor-reconnection.controls.copy.help",
      message:
        "Configure geography, land-use, dimension, status and qualification captions. Captions <= 28 characters; unit labels <= 8 and preserve hectares/metres; disclaimer <= 54.",
    },
  },
];

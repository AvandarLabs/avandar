import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable bounded recursive authoring controls. */
export const CONTROLS: StockControl[] = [
  {
    path: "capture",
    label: {
      id: "motionAtlas.carbon-storage-accounting.controls.capture.label",
      message: "capture",
    },
    kind: "object",
    controls: [
      {
        path: "capturedTonnesCO2",
        label: {
          id: "motionAtlas.carbon-storage-accounting.controls.capture.capturedTonnesCO2.label",
          message: "capturedTonnesCO2",
        },
        kind: "number",
        min: 0,
        max: 1000,
      },
      {
        path: "releasedTonnesCO2",
        label: {
          id: "motionAtlas.carbon-storage-accounting.controls.capture.releasedTonnesCO2.label",
          message: "releasedTonnesCO2",
        },
        kind: "number",
        min: 0,
        max: 1000,
      },
    ],
  },
  {
    path: "operatingEmissions",
    label: {
      id: "motionAtlas.carbon-storage-accounting.controls.operatingEmissions.label",
      message: "operatingEmissions",
    },
    kind: "collection",
    minItems: 1,
    maxItems: 3,
    itemSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          minLength: 0,
          maxLength: 20,
        },
        label: {
          type: "string",
          minLength: 0,
          maxLength: 26,
        },
        tonnesCO2e: {
          type: "number",
          minimum: 0,
          maximum: 1000,
        },
      },
      required: ["id", "label", "tonnesCO2e"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.carbon-storage-accounting.controls.operatingEmissions.item.id.label",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 20,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.carbon-storage-accounting.controls.operatingEmissions.item.label.label",
          message: "label",
        },
        kind: "text",
        minLength: 0,
        maxLength: 26,
      },
      {
        path: "tonnesCO2e",
        label: {
          id: "motionAtlas.carbon-storage-accounting.controls.operatingEmissions.item.tonnesCO2e.label",
          message: "tonnesCO2e",
        },
        kind: "number",
        min: 0,
        max: 1000,
      },
    ],
  },
  {
    path: "boundary",
    label: {
      id: "motionAtlas.carbon-storage-accounting.controls.boundary.label",
      message: "boundary",
    },
    kind: "object",
    controls: [
      {
        path: "label",
        label: {
          id: "motionAtlas.carbon-storage-accounting.controls.boundary.label.label",
          message: "label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 44,
      },
      {
        path: "periodLabel",
        label: {
          id: "motionAtlas.carbon-storage-accounting.controls.boundary.periodLabel.label",
          message: "periodLabel",
        },
        kind: "text",
        minLength: 1,
        maxLength: 44,
      },
      {
        path: "includedActivities",
        label: {
          id: "motionAtlas.carbon-storage-accounting.controls.boundary.includedActivities.label",
          message: "includedActivities",
        },
        kind: "text",
        minLength: 1,
        maxLength: 44,
      },
    ],
  },
  {
    path: "decision",
    label: {
      id: "motionAtlas.carbon-storage-accounting.controls.decision.label",
      message: "decision",
    },
    kind: "object",
    controls: [
      {
        path: "actorLabel",
        label: {
          id: "motionAtlas.carbon-storage-accounting.controls.decision.actorLabel.label",
          message: "actorLabel",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
      {
        path: "actionLabel",
        label: {
          id: "motionAtlas.carbon-storage-accounting.controls.decision.actionLabel.label",
          message: "actionLabel",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
    ],
  },
  {
    path: "showNetAccounting",
    label: {
      id: "motionAtlas.carbon-storage-accounting.controls.showNetAccounting.label",
      message: "showNetAccounting",
    },
    kind: "boolean",
  },
  {
    path: "view",
    label: {
      id: "motionAtlas.carbon-storage-accounting.controls.view.label",
      message: "view",
    },
    kind: "select",
    options: [
      {
        value: "cutaway",
        label: {
          id: "motionAtlas.carbon-storage-accounting.controls.view.cutaway",
          message: "cutaway",
        },
      },
      {
        value: "above-ground-vessel",
        label: {
          id: "motionAtlas.carbon-storage-accounting.controls.view.above-ground-vessel",
          message: "above-ground-vessel",
        },
      },
    ],
  },
  {
    path: "copy",
    label: {
      id: "motionAtlas.carbon-storage-accounting.controls.copy.label",
      message: "copy",
    },
    kind: "object",
    controls: [
      {
        path: "air",
        label: {
          id: "motionAtlas.carbon-storage-accounting.controls.copy.air.label",
          message: "air",
        },
        kind: "text",
        minLength: 0,
        maxLength: 30,
      },
      {
        path: "capture",
        label: {
          id: "motionAtlas.carbon-storage-accounting.controls.copy.capture.label",
          message: "capture",
        },
        kind: "text",
        minLength: 0,
        maxLength: 30,
      },
      {
        path: "retained",
        label: {
          id: "motionAtlas.carbon-storage-accounting.controls.copy.retained.label",
          message: "retained",
        },
        kind: "text",
        minLength: 0,
        maxLength: 30,
      },
      {
        path: "released",
        label: {
          id: "motionAtlas.carbon-storage-accounting.controls.copy.released.label",
          message: "released",
        },
        kind: "text",
        minLength: 0,
        maxLength: 30,
      },
      {
        path: "operations",
        label: {
          id: "motionAtlas.carbon-storage-accounting.controls.copy.operations.label",
          message: "operations",
        },
        kind: "text",
        minLength: 0,
        maxLength: 30,
      },
      {
        path: "net",
        label: {
          id: "motionAtlas.carbon-storage-accounting.controls.copy.net.label",
          message: "net",
        },
        kind: "text",
        minLength: 0,
        maxLength: 30,
      },
      {
        path: "massUnit",
        label: {
          id: "motionAtlas.carbon-storage-accounting.controls.copy.massUnit.label",
          message: "massUnit",
        },
        kind: "text",
        minLength: 0,
        maxLength: 10,
      },
      {
        path: "accountingUnit",
        label: {
          id: "motionAtlas.carbon-storage-accounting.controls.copy.accountingUnit.label",
          message: "accountingUnit",
        },
        kind: "text",
        minLength: 0,
        maxLength: 10,
      },
      {
        path: "disclaimer",
        label: {
          id: "motionAtlas.carbon-storage-accounting.controls.copy.disclaimer.label",
          message: "disclaimer",
        },
        kind: "text",
        minLength: 0,
        maxLength: 48,
      },
    ],
  },
];

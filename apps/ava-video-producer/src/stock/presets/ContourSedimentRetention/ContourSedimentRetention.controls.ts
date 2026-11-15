import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive serializable controls retain collection and numeric bounds. */
export const CONTROLS: StockControl[] = [
  {
    path: "sediment",
    label: {
      id: "motionAtlas.contour-sediment-retention.controls.sediment.label",
      message: "sediment",
    },
    kind: "object",
    controls: [
      {
        path: "mobilizedKg",
        label: {
          id: "motionAtlas.contour-sediment-retention.controls.sediment.mobilizedKg.label",
          message: "mobilizedKg",
        },
        kind: "number",
        min: 0,
        max: 1000,
        help: {
          id: "motionAtlas.contour-sediment-retention.controls.sediment.mobilizedKg.help",
          message: "Strictly positive; zero is rejected.",
        },
      },
      {
        path: "retainedKg",
        label: {
          id: "motionAtlas.contour-sediment-retention.controls.sediment.retainedKg.label",
          message: "retainedKg",
        },
        kind: "number",
        min: 0,
        max: 1000,
      },
    ],
  },
  {
    path: "intervention",
    label: {
      id: "motionAtlas.contour-sediment-retention.controls.intervention.label",
      message: "intervention",
    },
    kind: "object",
    controls: [
      {
        path: "kind",
        label: {
          id: "motionAtlas.contour-sediment-retention.controls.intervention.kind.label",
          message: "kind",
        },
        kind: "select",
        options: [
          {
            value: "vegetated-strip",
            label: {
              id: "motionAtlas.contour-sediment-retention.controls.intervention.kind.vegetated-strip",
              message: "vegetated-strip",
            },
          },
          {
            value: "stone-bund",
            label: {
              id: "motionAtlas.contour-sediment-retention.controls.intervention.kind.stone-bund",
              message: "stone-bund",
            },
          },
        ],
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.contour-sediment-retention.controls.intervention.label.label",
          message: "label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 30,
      },
    ],
  },
  {
    path: "boundary",
    label: {
      id: "motionAtlas.contour-sediment-retention.controls.boundary.label",
      message: "boundary",
    },
    kind: "object",
    controls: [
      {
        path: "slopeLabel",
        label: {
          id: "motionAtlas.contour-sediment-retention.controls.boundary.slopeLabel.label",
          message: "slopeLabel",
        },
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "periodLabel",
        label: {
          id: "motionAtlas.contour-sediment-retention.controls.boundary.periodLabel.label",
          message: "periodLabel",
        },
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
    ],
  },
  {
    path: "decision",
    label: {
      id: "motionAtlas.contour-sediment-retention.controls.decision.label",
      message: "decision",
    },
    kind: "object",
    controls: [
      {
        path: "actorLabel",
        label: {
          id: "motionAtlas.contour-sediment-retention.controls.decision.actorLabel.label",
          message: "actorLabel",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
      {
        path: "actionLabel",
        label: {
          id: "motionAtlas.contour-sediment-retention.controls.decision.actionLabel.label",
          message: "actionLabel",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
    ],
  },
  {
    path: "showExportTray",
    label: {
      id: "motionAtlas.contour-sediment-retention.controls.showExportTray.label",
      message: "showExportTray",
    },
    kind: "boolean",
  },
  {
    path: "copy",
    label: {
      id: "motionAtlas.contour-sediment-retention.controls.copy.label",
      message: "copy",
    },
    kind: "object",
    controls: [
      {
        path: "mobilized",
        label: {
          id: "motionAtlas.contour-sediment-retention.controls.copy.mobilized.label",
          message: "mobilized",
        },
        kind: "text",
        minLength: 0,
        maxLength: 30,
      },
      {
        path: "retained",
        label: {
          id: "motionAtlas.contour-sediment-retention.controls.copy.retained.label",
          message: "retained",
        },
        kind: "text",
        minLength: 0,
        maxLength: 30,
      },
      {
        path: "exported",
        label: {
          id: "motionAtlas.contour-sediment-retention.controls.copy.exported.label",
          message: "exported",
        },
        kind: "text",
        minLength: 0,
        maxLength: 30,
      },
      {
        path: "boundary",
        label: {
          id: "motionAtlas.contour-sediment-retention.controls.copy.boundary.label",
          message: "boundary",
        },
        kind: "text",
        minLength: 0,
        maxLength: 30,
      },
      {
        path: "unit",
        label: {
          id: "motionAtlas.contour-sediment-retention.controls.copy.unit.label",
          message: "unit",
        },
        kind: "text",
        minLength: 0,
        maxLength: 8,
      },
      {
        path: "disclaimer",
        label: {
          id: "motionAtlas.contour-sediment-retention.controls.copy.disclaimer.label",
          message: "disclaimer",
        },
        kind: "text",
        minLength: 0,
        maxLength: 52,
      },
    ],
  },
];

import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive serializable controls retain collection and numeric bounds. */
export const CONTROLS: StockControl[] = [
  {
    path: "event",
    label: {
      id: "motionAtlas.stormwater-storage-spill.controls.event.label",
      message: "event",
    },
    kind: "object",
    controls: [
      {
        path: "incomingM3",
        label: {
          id: "motionAtlas.stormwater-storage-spill.controls.event.incomingM3.label",
          message: "incomingM3",
        },
        kind: "number",
        min: 0,
        max: 10000,
        help: {
          id: "motionAtlas.stormwater-storage-spill.controls.event.incomingM3.help",
          message: "Strictly positive; zero is rejected.",
        },
      },
      {
        path: "infiltratedM3",
        label: {
          id: "motionAtlas.stormwater-storage-spill.controls.event.infiltratedM3.label",
          message: "infiltratedM3",
        },
        kind: "number",
        min: 0,
        max: 10000,
      },
      {
        path: "dischargedM3",
        label: {
          id: "motionAtlas.stormwater-storage-spill.controls.event.dischargedM3.label",
          message: "dischargedM3",
        },
        kind: "number",
        min: 0,
        max: 10000,
      },
    ],
  },
  {
    path: "detentionCapacityM3",
    label: {
      id: "motionAtlas.stormwater-storage-spill.controls.detentionCapacityM3.label",
      message: "detentionCapacityM3",
    },
    kind: "number",
    min: 0,
    max: 10000,
  },
  {
    path: "boundary",
    label: {
      id: "motionAtlas.stormwater-storage-spill.controls.boundary.label",
      message: "boundary",
    },
    kind: "object",
    controls: [
      {
        path: "locationLabel",
        label: {
          id: "motionAtlas.stormwater-storage-spill.controls.boundary.locationLabel.label",
          message: "locationLabel",
        },
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "periodLabel",
        label: {
          id: "motionAtlas.stormwater-storage-spill.controls.boundary.periodLabel.label",
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
      id: "motionAtlas.stormwater-storage-spill.controls.decision.label",
      message: "decision",
    },
    kind: "object",
    controls: [
      {
        path: "actorLabel",
        label: {
          id: "motionAtlas.stormwater-storage-spill.controls.decision.actorLabel.label",
          message: "actorLabel",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
      {
        path: "actionLabel",
        label: {
          id: "motionAtlas.stormwater-storage-spill.controls.decision.actionLabel.label",
          message: "actionLabel",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
    ],
  },
  {
    path: "overflowSide",
    label: {
      id: "motionAtlas.stormwater-storage-spill.controls.overflowSide.label",
      message: "overflowSide",
    },
    kind: "select",
    options: [
      {
        value: "left",
        label: {
          id: "motionAtlas.stormwater-storage-spill.controls.overflowSide.left",
          message: "left",
        },
      },
      {
        value: "right",
        label: {
          id: "motionAtlas.stormwater-storage-spill.controls.overflowSide.right",
          message: "right",
        },
      },
    ],
  },
  {
    path: "showBalance",
    label: {
      id: "motionAtlas.stormwater-storage-spill.controls.showBalance.label",
      message: "showBalance",
    },
    kind: "boolean",
  },
  {
    path: "copy",
    label: {
      id: "motionAtlas.stormwater-storage-spill.controls.copy.label",
      message: "copy",
    },
    kind: "object",
    controls: [
      {
        path: "inflow",
        label: {
          id: "motionAtlas.stormwater-storage-spill.controls.copy.inflow.label",
          message: "inflow",
        },
        kind: "text",
        minLength: 0,
        maxLength: 30,
      },
      {
        path: "infiltration",
        label: {
          id: "motionAtlas.stormwater-storage-spill.controls.copy.infiltration.label",
          message: "infiltration",
        },
        kind: "text",
        minLength: 0,
        maxLength: 30,
      },
      {
        path: "discharge",
        label: {
          id: "motionAtlas.stormwater-storage-spill.controls.copy.discharge.label",
          message: "discharge",
        },
        kind: "text",
        minLength: 0,
        maxLength: 30,
      },
      {
        path: "detained",
        label: {
          id: "motionAtlas.stormwater-storage-spill.controls.copy.detained.label",
          message: "detained",
        },
        kind: "text",
        minLength: 0,
        maxLength: 30,
      },
      {
        path: "overflow",
        label: {
          id: "motionAtlas.stormwater-storage-spill.controls.copy.overflow.label",
          message: "overflow",
        },
        kind: "text",
        minLength: 0,
        maxLength: 30,
      },
      {
        path: "capacity",
        label: {
          id: "motionAtlas.stormwater-storage-spill.controls.copy.capacity.label",
          message: "capacity",
        },
        kind: "text",
        minLength: 0,
        maxLength: 30,
      },
      {
        path: "unit",
        label: {
          id: "motionAtlas.stormwater-storage-spill.controls.copy.unit.label",
          message: "unit",
        },
        kind: "text",
        minLength: 0,
        maxLength: 8,
      },
      {
        path: "disclaimer",
        label: {
          id: "motionAtlas.stormwater-storage-spill.controls.copy.disclaimer.label",
          message: "disclaimer",
        },
        kind: "text",
        minLength: 0,
        maxLength: 50,
      },
    ],
  },
];

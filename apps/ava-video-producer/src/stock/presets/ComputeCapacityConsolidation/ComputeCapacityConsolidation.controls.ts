import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive serializable controls retain collection and numeric bounds. */
export const CONTROLS: StockControl[] = [
  {
    path: "hosts",
    label: {
      id: "motionAtlas.compute-capacity-consolidation.controls.hosts.label",
      message: "hosts",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 4,
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
          maxLength: 20,
        },
        capacityCpuHours: {
          type: "number",
          exclusiveMinimum: 0,
          maximum: 64,
        },
      },
      required: ["id", "label", "capacityCpuHours"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.compute-capacity-consolidation.controls.hosts.id.label",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 20,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.compute-capacity-consolidation.controls.hosts.label.label",
          message: "label",
        },
        kind: "text",
        minLength: 0,
        maxLength: 20,
      },
      {
        path: "capacityCpuHours",
        label: {
          id: "motionAtlas.compute-capacity-consolidation.controls.hosts.capacityCpuHours.label",
          message: "capacityCpuHours",
        },
        kind: "number",
        min: 0,
        max: 64,
        help: {
          id: "motionAtlas.compute-capacity-consolidation.controls.hosts.capacityCpuHours.help",
          message: "Strictly positive; zero is rejected.",
        },
      },
    ],
  },
  {
    path: "jobs",
    label: {
      id: "motionAtlas.compute-capacity-consolidation.controls.jobs.label",
      message: "jobs",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 8,
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
          maxLength: 18,
        },
        cpuHours: {
          type: "number",
          exclusiveMinimum: 0,
          maximum: 64,
        },
        initialHostId: {
          type: "string",
          minLength: 0,
          maxLength: 20,
        },
        finalHostId: {
          type: "string",
          minLength: 0,
          maxLength: 20,
        },
      },
      required: ["id", "label", "cpuHours", "initialHostId", "finalHostId"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.compute-capacity-consolidation.controls.jobs.id.label",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 20,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.compute-capacity-consolidation.controls.jobs.label.label",
          message: "label",
        },
        kind: "text",
        minLength: 0,
        maxLength: 18,
      },
      {
        path: "cpuHours",
        label: {
          id: "motionAtlas.compute-capacity-consolidation.controls.jobs.cpuHours.label",
          message: "cpuHours",
        },
        kind: "number",
        min: 0,
        max: 64,
        help: {
          id: "motionAtlas.compute-capacity-consolidation.controls.jobs.cpuHours.help",
          message: "Strictly positive; zero is rejected.",
        },
      },
      {
        path: "initialHostId",
        label: {
          id: "motionAtlas.compute-capacity-consolidation.controls.jobs.initialHostId.label",
          message: "initialHostId",
        },
        kind: "select",
        optionsFrom: {
          path: "hosts",
          valueKey: "id",
          labelKey: "label",
        },
      },
      {
        path: "finalHostId",
        label: {
          id: "motionAtlas.compute-capacity-consolidation.controls.jobs.finalHostId.label",
          message: "finalHostId",
        },
        kind: "select",
        optionsFrom: {
          path: "hosts",
          valueKey: "id",
          labelKey: "label",
        },
      },
    ],
  },
  {
    path: "windowLabel",
    label: {
      id: "motionAtlas.compute-capacity-consolidation.controls.windowLabel.label",
      message: "windowLabel",
    },
    kind: "text",
    minLength: 1,
    maxLength: 36,
  },
  {
    path: "decision",
    label: {
      id: "motionAtlas.compute-capacity-consolidation.controls.decision.label",
      message: "decision",
    },
    kind: "object",
    controls: [
      {
        path: "actorLabel",
        label: {
          id: "motionAtlas.compute-capacity-consolidation.controls.decision.actorLabel.label",
          message: "actorLabel",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
      {
        path: "actionLabel",
        label: {
          id: "motionAtlas.compute-capacity-consolidation.controls.decision.actionLabel.label",
          message: "actionLabel",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
    ],
  },
  {
    path: "emptyHostState",
    label: {
      id: "motionAtlas.compute-capacity-consolidation.controls.emptyHostState.label",
      message: "emptyHostState",
    },
    kind: "select",
    options: [
      {
        value: "sleep",
        label: {
          id: "motionAtlas.compute-capacity-consolidation.controls.emptyHostState.sleep",
          message: "sleep",
        },
      },
      {
        value: "available",
        label: {
          id: "motionAtlas.compute-capacity-consolidation.controls.emptyHostState.available",
          message: "available",
        },
      },
    ],
  },
  {
    path: "showCapacityGuides",
    label: {
      id: "motionAtlas.compute-capacity-consolidation.controls.showCapacityGuides.label",
      message: "showCapacityGuides",
    },
    kind: "boolean",
  },
  {
    path: "copy",
    label: {
      id: "motionAtlas.compute-capacity-consolidation.controls.copy.label",
      message: "copy",
    },
    kind: "object",
    controls: [
      {
        path: "before",
        label: {
          id: "motionAtlas.compute-capacity-consolidation.controls.copy.before.label",
          message: "before",
        },
        kind: "text",
        minLength: 0,
        maxLength: 28,
      },
      {
        path: "after",
        label: {
          id: "motionAtlas.compute-capacity-consolidation.controls.copy.after.label",
          message: "after",
        },
        kind: "text",
        minLength: 0,
        maxLength: 28,
      },
      {
        path: "work",
        label: {
          id: "motionAtlas.compute-capacity-consolidation.controls.copy.work.label",
          message: "work",
        },
        kind: "text",
        minLength: 0,
        maxLength: 28,
      },
      {
        path: "occupied",
        label: {
          id: "motionAtlas.compute-capacity-consolidation.controls.copy.occupied.label",
          message: "occupied",
        },
        kind: "text",
        minLength: 0,
        maxLength: 28,
      },
      {
        path: "sleep",
        label: {
          id: "motionAtlas.compute-capacity-consolidation.controls.copy.sleep.label",
          message: "sleep",
        },
        kind: "text",
        minLength: 0,
        maxLength: 28,
      },
      {
        path: "available",
        label: {
          id: "motionAtlas.compute-capacity-consolidation.controls.copy.available.label",
          message: "available",
        },
        kind: "text",
        minLength: 0,
        maxLength: 28,
      },
      {
        path: "unit",
        label: {
          id: "motionAtlas.compute-capacity-consolidation.controls.copy.unit.label",
          message: "unit",
        },
        kind: "text",
        minLength: 0,
        maxLength: 14,
      },
      {
        path: "disclaimer",
        label: {
          id: "motionAtlas.compute-capacity-consolidation.controls.copy.disclaimer.label",
          message: "disclaimer",
        },
        kind: "text",
        minLength: 0,
        maxLength: 48,
      },
    ],
  },
];

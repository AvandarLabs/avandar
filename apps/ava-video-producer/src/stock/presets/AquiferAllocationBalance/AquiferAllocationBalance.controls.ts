import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable recursive controls preserve literal accepted field bounds. */
export const CONTROLS: StockControl[] = [
  {
    path: "aquifer",
    label: {
      id: "motionAtlas.aquifer-allocation-balance.controls.aquifer",
      message: "aquifer",
    },
    kind: "object",
    controls: [
      {
        path: "initialM3",
        label: {
          id: "motionAtlas.aquifer-allocation-balance.controls.aquifer.initialM3",
          message: "initialM3",
        },
        kind: "number",
        min: 0,
        max: 1000000,
      },
      {
        path: "diagramCapacityM3",
        label: {
          id: "motionAtlas.aquifer-allocation-balance.controls.aquifer.diagramCapacityM3",
          message: "diagramCapacityM3",
        },
        kind: "number",
        min: 0,
        max: 1000000,
      },
    ],
    help: {
      id: "motionAtlas.aquifer-allocation-balance.controls.aquifer.help",
      message:
        "Define initial accounting stock and the capacity of the schematic storage scale. Initial >= 0; diagram capacity > 0 and <= 1000000 m3; initial <= capacity. Diagram capacity is a visual bound, not a measured aquifer safe yield.",
    },
  },
  {
    path: "flows",
    label: {
      id: "motionAtlas.aquifer-allocation-balance.controls.flows",
      message: "flows",
    },
    kind: "object",
    controls: [
      {
        path: "rechargeM3",
        label: {
          id: "motionAtlas.aquifer-allocation-balance.controls.flows.rechargeM3",
          message: "rechargeM3",
        },
        kind: "number",
        min: 0,
        max: 1000000,
      },
      {
        path: "naturalOutflowM3",
        label: {
          id: "motionAtlas.aquifer-allocation-balance.controls.flows.naturalOutflowM3",
          message: "naturalOutflowM3",
        },
        kind: "number",
        min: 0,
        max: 1000000,
      },
      {
        path: "requestedWithdrawalM3",
        label: {
          id: "motionAtlas.aquifer-allocation-balance.controls.flows.requestedWithdrawalM3",
          message: "requestedWithdrawalM3",
        },
        kind: "number",
        min: 0,
        max: 1000000,
      },
      {
        path: "approvedWithdrawalM3",
        label: {
          id: "motionAtlas.aquifer-allocation-balance.controls.flows.approvedWithdrawalM3",
          message: "approvedWithdrawalM3",
        },
        kind: "number",
        min: 0,
        max: 1000000,
      },
    ],
    help: {
      id: "motionAtlas.aquifer-allocation-balance.controls.flows.help",
      message:
        "Supply recharge, natural outflow, requested withdrawal and the executed allocation. All values 0..1000000 m3; approved <= requested. Initial + recharge must fit diagram capacity; final = initial + recharge - natural outflow - approved must be >= 0. Request is not an executed flow.",
    },
  },
  {
    path: "boundary",
    label: {
      id: "motionAtlas.aquifer-allocation-balance.controls.boundary",
      message: "boundary",
    },
    kind: "object",
    controls: [
      {
        path: "label",
        label: {
          id: "motionAtlas.aquifer-allocation-balance.controls.boundary.label",
          message: "label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 44,
      },
      {
        path: "periodLabel",
        label: {
          id: "motionAtlas.aquifer-allocation-balance.controls.boundary.periodLabel",
          message: "periodLabel",
        },
        kind: "text",
        minLength: 1,
        maxLength: 44,
      },
      {
        path: "scopeLabel",
        label: {
          id: "motionAtlas.aquifer-allocation-balance.controls.boundary.scopeLabel",
          message: "scopeLabel",
        },
        kind: "text",
        minLength: 1,
        maxLength: 44,
      },
    ],
    help: {
      id: "motionAtlas.aquifer-allocation-balance.controls.boundary.help",
      message:
        "Name the reservoir boundary, period and included accounting scope. Strings 1..44 characters; all supplied flow totals use this same period and boundary.",
    },
  },
  {
    path: "decision",
    label: {
      id: "motionAtlas.aquifer-allocation-balance.controls.decision",
      message: "decision",
    },
    kind: "object",
    controls: [
      {
        path: "actorLabel",
        label: {
          id: "motionAtlas.aquifer-allocation-balance.controls.decision.actorLabel",
          message: "actorLabel",
        },
        kind: "text",
        minLength: 1,
        maxLength: 34,
      },
      {
        path: "actionLabel",
        label: {
          id: "motionAtlas.aquifer-allocation-balance.controls.decision.actionLabel",
          message: "actionLabel",
        },
        kind: "text",
        minLength: 1,
        maxLength: 34,
      },
    ],
    help: {
      id: "motionAtlas.aquifer-allocation-balance.controls.decision.help",
      message:
        "Identify the actor setting the final allocation. Strings 1..34 characters; the choice is supplied, not presented as an optimized or legally authorized allocation.",
    },
  },
  {
    path: "showUnallocatedRequest",
    label: {
      id: "motionAtlas.aquifer-allocation-balance.controls.showUnallocatedRequest",
      message: "showUnallocatedRequest",
    },
    kind: "boolean",
    help: {
      id: "motionAtlas.aquifer-allocation-balance.controls.showUnallocatedRequest.help",
      message:
        "Retain the difference between requested and approved withdrawal as a hollow bracket. Boolean; unallocated request = request minus approval and never enters the water balance.",
    },
  },
  {
    path: "copy",
    label: {
      id: "motionAtlas.aquifer-allocation-balance.controls.copy",
      message: "copy",
    },
    kind: "object",
    controls: [
      {
        path: "initial",
        label: {
          id: "motionAtlas.aquifer-allocation-balance.controls.copy.initial",
          message: "initial",
        },
        kind: "text",
        minLength: 0,
        maxLength: 28,
      },
      {
        path: "recharge",
        label: {
          id: "motionAtlas.aquifer-allocation-balance.controls.copy.recharge",
          message: "recharge",
        },
        kind: "text",
        minLength: 0,
        maxLength: 28,
      },
      {
        path: "naturalOutflow",
        label: {
          id: "motionAtlas.aquifer-allocation-balance.controls.copy.naturalOutflow",
          message: "naturalOutflow",
        },
        kind: "text",
        minLength: 0,
        maxLength: 28,
      },
      {
        path: "requested",
        label: {
          id: "motionAtlas.aquifer-allocation-balance.controls.copy.requested",
          message: "requested",
        },
        kind: "text",
        minLength: 0,
        maxLength: 28,
      },
      {
        path: "approved",
        label: {
          id: "motionAtlas.aquifer-allocation-balance.controls.copy.approved",
          message: "approved",
        },
        kind: "text",
        minLength: 0,
        maxLength: 28,
      },
      {
        path: "unallocated",
        label: {
          id: "motionAtlas.aquifer-allocation-balance.controls.copy.unallocated",
          message: "unallocated",
        },
        kind: "text",
        minLength: 0,
        maxLength: 28,
      },
      {
        path: "final",
        label: {
          id: "motionAtlas.aquifer-allocation-balance.controls.copy.final",
          message: "final",
        },
        kind: "text",
        minLength: 0,
        maxLength: 28,
      },
      {
        path: "unit",
        label: {
          id: "motionAtlas.aquifer-allocation-balance.controls.copy.unit",
          message: "unit",
        },
        kind: "text",
        minLength: 0,
        maxLength: 8,
      },
      {
        path: "disclaimer",
        label: {
          id: "motionAtlas.aquifer-allocation-balance.controls.copy.disclaimer",
          message: "disclaimer",
        },
        kind: "text",
        minLength: 0,
        maxLength: 56,
      },
    ],
    help: {
      id: "motionAtlas.aquifer-allocation-balance.controls.copy.help",
      message:
        "Configure every water-budget and qualification caption. Captions <= 28 characters; unit <= 8 and denotes cubic metres; disclaimer <= 56.",
    },
  },
];

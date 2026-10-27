import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable recursive controls preserve literal accepted field bounds. */
export const CONTROLS: StockControl[] = [
  {
    path: "battery",
    label: {
      id: "motionAtlas.battery-dispatch-balance.controls.battery",
      message: "battery",
    },
    kind: "object",
    controls: [
      {
        path: "capacityKwh",
        label: {
          id: "motionAtlas.battery-dispatch-balance.controls.battery.capacityKwh",
          message: "capacityKwh",
        },
        kind: "number",
        min: 0,
        max: 10000,
      },
      {
        path: "initialStoredKwh",
        label: {
          id: "motionAtlas.battery-dispatch-balance.controls.battery.initialStoredKwh",
          message: "initialStoredKwh",
        },
        kind: "number",
        min: 0,
        max: 10000,
      },
    ],
    help: {
      id: "motionAtlas.battery-dispatch-balance.controls.battery.help",
      message:
        "Define usable capacity and energy already inside the battery boundary. Capacity > 0 and <= 10000 kWh; initial stored between 0 and capacity.",
    },
  },
  {
    path: "cycle",
    label: {
      id: "motionAtlas.battery-dispatch-balance.controls.cycle",
      message: "cycle",
    },
    kind: "object",
    controls: [
      {
        path: "chargeInputKwh",
        label: {
          id: "motionAtlas.battery-dispatch-balance.controls.cycle.chargeInputKwh",
          message: "chargeInputKwh",
        },
        kind: "number",
        min: 0,
        max: 10000,
      },
      {
        path: "chargeLossKwh",
        label: {
          id: "motionAtlas.battery-dispatch-balance.controls.cycle.chargeLossKwh",
          message: "chargeLossKwh",
        },
        kind: "number",
        min: 0,
        max: 10000,
      },
      {
        path: "deliveredKwh",
        label: {
          id: "motionAtlas.battery-dispatch-balance.controls.cycle.deliveredKwh",
          message: "deliveredKwh",
        },
        kind: "number",
        min: 0,
        max: 10000,
      },
      {
        path: "dischargeLossKwh",
        label: {
          id: "motionAtlas.battery-dispatch-balance.controls.cycle.dischargeLossKwh",
          message: "dischargeLossKwh",
        },
        kind: "number",
        min: 0,
        max: 10000,
      },
    ],
    help: {
      id: "motionAtlas.battery-dispatch-balance.controls.cycle.help",
      message:
        "Supply the energy entering, delivered and lost during this cycle. All values finite and 0..10000 kWh; chargeLoss <= chargeInput. Peak stored = initial + input - chargeLoss must fit capacity. Final stored = peak - delivered - dischargeLoss must be >= 0.",
    },
  },
  {
    path: "windows",
    label: {
      id: "motionAtlas.battery-dispatch-balance.controls.windows",
      message: "windows",
    },
    kind: "object",
    controls: [
      {
        path: "chargeLabel",
        label: {
          id: "motionAtlas.battery-dispatch-balance.controls.windows.chargeLabel",
          message: "chargeLabel",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
      {
        path: "dispatchLabel",
        label: {
          id: "motionAtlas.battery-dispatch-balance.controls.windows.dispatchLabel",
          message: "dispatchLabel",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
      {
        path: "sourceLabel",
        label: {
          id: "motionAtlas.battery-dispatch-balance.controls.windows.sourceLabel",
          message: "sourceLabel",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
      {
        path: "loadLabel",
        label: {
          id: "motionAtlas.battery-dispatch-balance.controls.windows.loadLabel",
          message: "loadLabel",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
    ],
    help: {
      id: "motionAtlas.battery-dispatch-balance.controls.windows.help",
      message:
        "Label the ordered time windows, source and destination. Strings 1..32 characters; charging precedes dispatch. Labels do not establish renewable origin or emissions intensity.",
    },
  },
  {
    path: "decision",
    label: {
      id: "motionAtlas.battery-dispatch-balance.controls.decision",
      message: "decision",
    },
    kind: "object",
    controls: [
      {
        path: "actorLabel",
        label: {
          id: "motionAtlas.battery-dispatch-balance.controls.decision.actorLabel",
          message: "actorLabel",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
      {
        path: "actionLabel",
        label: {
          id: "motionAtlas.battery-dispatch-balance.controls.decision.actionLabel",
          message: "actionLabel",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
    ],
    help: {
      id: "motionAtlas.battery-dispatch-balance.controls.decision.help",
      message:
        "Expose who implements the supplied schedule. Strings 1..32 characters; no autonomous grid optimization is claimed.",
    },
  },
  {
    path: "showLossChannels",
    label: {
      id: "motionAtlas.battery-dispatch-balance.controls.showLossChannels",
      message: "showLossChannels",
    },
    kind: "boolean",
    help: {
      id: "motionAtlas.battery-dispatch-balance.controls.showLossChannels.help",
      message:
        "Show separate heat-like ribbons for charge and discharge loss. Boolean; loss numbers remain in the equation even when decorative ribbons are hidden.",
    },
  },
  {
    path: "orientation",
    label: {
      id: "motionAtlas.battery-dispatch-balance.controls.orientation",
      message: "orientation",
    },
    kind: "select",
    options: [
      {
        value: "horizontal",
        label: {
          id: "motionAtlas.battery-dispatch-balance.options.orientation.horizontal",
          message: "horizontal",
        },
      },
      {
        value: "vertical",
        label: {
          id: "motionAtlas.battery-dispatch-balance.options.orientation.vertical",
          message: "vertical",
        },
      },
    ],
    help: {
      id: "motionAtlas.battery-dispatch-balance.controls.orientation.help",
      message:
        "Choose a left-to-right or top-to-bottom battery and load layout. Enum only; energy accounting and window ordering stay identical.",
    },
  },
  {
    path: "copy",
    label: {
      id: "motionAtlas.battery-dispatch-balance.controls.copy",
      message: "copy",
    },
    kind: "object",
    controls: [
      {
        path: "capacity",
        label: {
          id: "motionAtlas.battery-dispatch-balance.controls.copy.capacity",
          message: "capacity",
        },
        kind: "text",
        minLength: 0,
        maxLength: 26,
      },
      {
        path: "stored",
        label: {
          id: "motionAtlas.battery-dispatch-balance.controls.copy.stored",
          message: "stored",
        },
        kind: "text",
        minLength: 0,
        maxLength: 26,
      },
      {
        path: "input",
        label: {
          id: "motionAtlas.battery-dispatch-balance.controls.copy.input",
          message: "input",
        },
        kind: "text",
        minLength: 0,
        maxLength: 26,
      },
      {
        path: "delivered",
        label: {
          id: "motionAtlas.battery-dispatch-balance.controls.copy.delivered",
          message: "delivered",
        },
        kind: "text",
        minLength: 0,
        maxLength: 26,
      },
      {
        path: "chargeLoss",
        label: {
          id: "motionAtlas.battery-dispatch-balance.controls.copy.chargeLoss",
          message: "chargeLoss",
        },
        kind: "text",
        minLength: 0,
        maxLength: 26,
      },
      {
        path: "dischargeLoss",
        label: {
          id: "motionAtlas.battery-dispatch-balance.controls.copy.dischargeLoss",
          message: "dischargeLoss",
        },
        kind: "text",
        minLength: 0,
        maxLength: 26,
      },
      {
        path: "unit",
        label: {
          id: "motionAtlas.battery-dispatch-balance.controls.copy.unit",
          message: "unit",
        },
        kind: "text",
        minLength: 0,
        maxLength: 8,
      },
      {
        path: "disclaimer",
        label: {
          id: "motionAtlas.battery-dispatch-balance.controls.copy.disclaimer",
          message: "disclaimer",
        },
        kind: "text",
        minLength: 0,
        maxLength: 48,
      },
    ],
    help: {
      id: "motionAtlas.battery-dispatch-balance.controls.copy.help",
      message:
        "Configure remaining energy captions, unit and qualification. Captions <= 26 characters; unit <= 8 and denotes kilowatt-hours; disclaimer <= 48.",
    },
  },
];

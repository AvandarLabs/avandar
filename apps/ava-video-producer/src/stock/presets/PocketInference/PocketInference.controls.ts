import type { StockControl } from "../../contracts/StockContract.types";

/** Serializable controls preserve nested fields and collection bounds. */
export const CONTROLS: StockControl[] = [
  {
    path: "model",
    label: {
      id: "motionAtlas.pocket-inference.controls.model",
      message: "model",
    },
    help: {
      id: "motionAtlas.pocket-inference.controls.model.help",
      message:
        "Model cartridge name and optional human-readable detail, such as an authored model version.",
    },
    kind: "object",
    controls: [
      {
        path: "label",
        label: {
          id: "motionAtlas.pocket-inference.controls.model.label",
          message: "label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 28,
      },
      {
        path: "detail",
        label: {
          id: "motionAtlas.pocket-inference.controls.model.detail",
          message: "detail",
        },
        kind: "text",
        minLength: 0,
        maxLength: 28,
      },
    ],
  },
  {
    path: "input",
    label: {
      id: "motionAtlas.pocket-inference.controls.input",
      message: "input",
    },
    help: {
      id: "motionAtlas.pocket-inference.controls.input.help",
      message: "The complete supplied input shown within the device.",
    },
    kind: "object",
    controls: [
      {
        path: "label",
        label: {
          id: "motionAtlas.pocket-inference.controls.input.label",
          message: "label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
      },
      {
        path: "text",
        label: {
          id: "motionAtlas.pocket-inference.controls.input.text",
          message: "text",
        },
        kind: "text",
        minLength: 1,
        maxLength: 96,
      },
    ],
  },
  {
    path: "response",
    label: {
      id: "motionAtlas.pocket-inference.controls.response",
      message: "response",
    },
    help: {
      id: "motionAtlas.pocket-inference.controls.response.help",
      message:
        "Literal response content supplied by the author, never generated or evaluated by the animation.",
    },
    kind: "object",
    controls: [
      {
        path: "label",
        label: {
          id: "motionAtlas.pocket-inference.controls.response.label",
          message: "label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
      {
        path: "lines",
        label: {
          id: "motionAtlas.pocket-inference.controls.response.lines",
          message: "lines",
        },
        kind: "collection",
        minItems: 1,
        maxItems: 3,
        itemSchema: {
          type: "string",
          minLength: 1,
          maxLength: 44,
        },
        itemControls: [
          {
            path: "",
            label: {
              id: "motionAtlas.pocket-inference.controls.response.lines.line",
              message: "line",
            },
            kind: "text",
            minLength: 1,
            maxLength: 44,
          },
        ],
      },
    ],
  },
  {
    path: "copy",
    label: {
      id: "motionAtlas.pocket-inference.controls.copy",
      message: "copy",
    },
    help: {
      id: "motionAtlas.pocket-inference.controls.copy.help",
      message: "All device, boundary, and example captions.",
    },
    kind: "object",
    controls: [
      {
        path: "device",
        label: {
          id: "motionAtlas.pocket-inference.controls.copy.device",
          message: "device",
        },
        kind: "text",
        minLength: 1,
        maxLength: 34,
      },
      {
        path: "boundary",
        label: {
          id: "motionAtlas.pocket-inference.controls.copy.boundary",
          message: "boundary",
        },
        kind: "text",
        minLength: 1,
        maxLength: 34,
      },
      {
        path: "example",
        label: {
          id: "motionAtlas.pocket-inference.controls.copy.example",
          message: "example",
        },
        kind: "text",
        minLength: 1,
        maxLength: 34,
      },
    ],
  },
  {
    path: "deviceShape",
    label: {
      id: "motionAtlas.pocket-inference.controls.deviceShape",
      message: "deviceShape",
    },
    help: {
      id: "motionAtlas.pocket-inference.controls.deviceShape.help",
      message:
        "Choose the outer silhouette while retaining the same internal computation choreography.",
    },
    kind: "select",
    options: [
      {
        value: "phone",
        label: {
          id: "motionAtlas.pocket-inference.options.deviceShape.phone",
          message: "phone",
        },
      },
      {
        value: "tablet",
        label: {
          id: "motionAtlas.pocket-inference.options.deviceShape.tablet",
          message: "tablet",
        },
      },
      {
        value: "laptop",
        label: {
          id: "motionAtlas.pocket-inference.options.deviceShape.laptop",
          message: "laptop",
        },
      },
    ],
  },
  {
    path: "showCutaway",
    label: {
      id: "motionAtlas.pocket-inference.controls.showCutaway",
      message: "showCutaway",
    },
    help: {
      id: "motionAtlas.pocket-inference.controls.showCutaway.help",
      message:
        "Reveal the model socket within the device; when false, keep a labeled inset on the screen so computation location remains legible.",
    },
    kind: "boolean",
  },
  {
    path: "showLabels",
    label: {
      id: "motionAtlas.pocket-inference.controls.showLabels",
      message: "showLabels",
    },
    help: {
      id: "motionAtlas.pocket-inference.controls.showLabels.help",
      message:
        "Show all supplied text; when hidden, bounded writing strokes represent the supplied input and response lines.",
    },
    kind: "boolean",
  },
];

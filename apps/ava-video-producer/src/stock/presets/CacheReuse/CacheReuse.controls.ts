import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive serializable controls with exact accepted structural bounds. */
export const CONTROLS: StockControl[] = [
  {
    path: "request",
    help: {
      id: "motionAtlas.cache-reuse.controls.request.help",
      message:
        "The shared lookup key and operation label used by both requests. key 1..20 characters; label 1..24 characters; both depicted requests use exactly this key",
    },
    label: {
      id: "motionAtlas.cache-reuse.controls.request",
      message: "request",
    },
    kind: "object",
    controls: [
      {
        path: "key",
        label: {
          id: "motionAtlas.cache-reuse.controls.key",
          message: "key",
        },
        kind: "text",
        minLength: 1,
        maxLength: 20,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.cache-reuse.controls.label",
          message: "label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
      },
    ],
  },
  {
    path: "result",
    help: {
      id: "motionAtlas.cache-reuse.controls.result.help",
      message:
        "The exact result shown at the origin, in storage, and in both responses. label 1..20 characters; value 1..28 characters",
    },
    label: {
      id: "motionAtlas.cache-reuse.controls.result",
      message: "result",
    },
    kind: "object",
    controls: [
      {
        path: "label",
        label: {
          id: "motionAtlas.cache-reuse.controls.label",
          message: "label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 20,
      },
      {
        path: "value",
        label: {
          id: "motionAtlas.cache-reuse.controls.value",
          message: "value",
        },
        kind: "text",
        minLength: 1,
        maxLength: 28,
      },
    ],
  },
  {
    path: "systemLabels",
    help: {
      id: "motionAtlas.cache-reuse.controls.systemLabels.help",
      message:
        "Names the three participants in the lookup. All three keys required; each label 1..22 characters",
    },
    label: {
      id: "motionAtlas.cache-reuse.controls.systemLabels",
      message: "systemLabels",
    },
    kind: "object",
    controls: [
      {
        path: "requester",
        label: {
          id: "motionAtlas.cache-reuse.controls.requester",
          message: "requester",
        },
        kind: "text",
        minLength: 1,
        maxLength: 22,
      },
      {
        path: "cache",
        label: {
          id: "motionAtlas.cache-reuse.controls.cache",
          message: "cache",
        },
        kind: "text",
        minLength: 1,
        maxLength: 22,
      },
      {
        path: "origin",
        label: {
          id: "motionAtlas.cache-reuse.controls.origin",
          message: "origin",
        },
        kind: "text",
        minLength: 1,
        maxLength: 22,
      },
    ],
  },
  {
    path: "pathLabels",
    help: {
      id: "motionAtlas.cache-reuse.controls.pathLabels.help",
      message:
        "Provides the explanatory captions for the miss, storage, and hit beats. All three keys required; each label 1..26 characters",
    },
    label: {
      id: "motionAtlas.cache-reuse.controls.pathLabels",
      message: "pathLabels",
    },
    kind: "object",
    controls: [
      {
        path: "miss",
        label: {
          id: "motionAtlas.cache-reuse.controls.miss",
          message: "miss",
        },
        kind: "text",
        minLength: 1,
        maxLength: 26,
      },
      {
        path: "store",
        label: {
          id: "motionAtlas.cache-reuse.controls.store",
          message: "store",
        },
        kind: "text",
        minLength: 1,
        maxLength: 26,
      },
      {
        path: "hit",
        label: {
          id: "motionAtlas.cache-reuse.controls.hit",
          message: "hit",
        },
        kind: "text",
        minLength: 1,
        maxLength: 26,
      },
    ],
  },
  {
    path: "showStoredValue",
    help: {
      id: "motionAtlas.cache-reuse.controls.showStoredValue.help",
      message:
        "Shows the result value within the stored entry, with its key always visible. boolean",
    },
    label: {
      id: "motionAtlas.cache-reuse.controls.showStoredValue",
      message: "showStoredValue",
    },
    kind: "boolean",
  },
  {
    path: "showPathLabels",
    help: {
      id: "motionAtlas.cache-reuse.controls.showPathLabels.help",
      message:
        "Shows the authored explanatory captions along the two lookup routes. boolean",
    },
    label: {
      id: "motionAtlas.cache-reuse.controls.showPathLabels",
      message: "showPathLabels",
    },
    kind: "boolean",
  },
];

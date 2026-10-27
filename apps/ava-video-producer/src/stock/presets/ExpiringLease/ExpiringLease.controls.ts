import type { StockControl } from "../../contracts/StockContract.types";

/** Recursive serializable controls retain exact accepted bounds. */
export const CONTROLS: StockControl[] = [
  {
    path: "participants",
    label: {
      id: "motionAtlas.expiring-lease.controls.participants",
      message: "participants",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 4,
    itemSchema: {
      type: "object",
      additionalProperties: false,
      required: ["id", "label"],
      properties: {
        id: {
          type: "string",
          minLength: 0,
          maxLength: 16,
        },
        label: {
          type: "string",
          minLength: 1,
          maxLength: 24,
        },
      },
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.expiring-lease.controls.id",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 16,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.expiring-lease.controls.label",
          message: "label",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
      },
    ],
    help: {
      id: "motionAtlas.expiring-lease.controls.participants.help",
      message:
        "Participant sockets arranged around the neutral dock, each showing whether it holds the single token.",
    },
  },
  {
    path: "holderId",
    label: {
      id: "motionAtlas.expiring-lease.controls.holderId",
      message: "holderId",
    },
    kind: "select",
    optionsFrom: {
      path: "participants",
      valueKey: "id",
      labelKey: "label",
      scope: "root",
    },
    help: {
      id: "motionAtlas.expiring-lease.controls.holderId.help",
      message:
        "The participant who holds the token before expiry. No successor is inferred.",
    },
  },
  {
    path: "permissionLabel",
    label: {
      id: "motionAtlas.expiring-lease.controls.permissionLabel",
      message: "permissionLabel",
    },
    kind: "text",
    minLength: 1,
    maxLength: 30,
    help: {
      id: "motionAtlas.expiring-lease.controls.permissionLabel.help",
      message: "The particular permission represented by the single token.",
    },
  },
  {
    path: "lifetime",
    label: {
      id: "motionAtlas.expiring-lease.controls.lifetime",
      message: "lifetime",
    },
    kind: "object",
    controls: [
      {
        path: "value",
        label: {
          id: "motionAtlas.expiring-lease.controls.value",
          message: "value",
        },
        kind: "number",
        min: 1,
        max: 8,
        step: 1,
      },
      {
        path: "unit",
        label: {
          id: "motionAtlas.expiring-lease.controls.unit",
          message: "unit",
        },
        kind: "text",
        minLength: 1,
        maxLength: 20,
      },
    ],
    help: {
      id: "motionAtlas.expiring-lease.controls.lifetime.help",
      message:
        "The supplied illustrative lease length. The collar uses one segment per unit and the scene compresses the entire lifetime into its main beat.",
    },
  },
  {
    path: "copy",
    label: {
      id: "motionAtlas.expiring-lease.controls.copy",
      message: "copy",
    },
    kind: "object",
    controls: [
      {
        path: "dock",
        label: {
          id: "motionAtlas.expiring-lease.controls.dock",
          message: "dock",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
      {
        path: "held",
        label: {
          id: "motionAtlas.expiring-lease.controls.held",
          message: "held",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
      {
        path: "expired",
        label: {
          id: "motionAtlas.expiring-lease.controls.expired",
          message: "expired",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
      {
        path: "unassigned",
        label: {
          id: "motionAtlas.expiring-lease.controls.unassigned",
          message: "unassigned",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
      {
        path: "example",
        label: {
          id: "motionAtlas.expiring-lease.controls.example",
          message: "example",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
    ],
    help: {
      id: "motionAtlas.expiring-lease.controls.copy.help",
      message: "All neutral-dock, possession, expiry, and example captions.",
    },
  },
  {
    path: "showLifetime",
    label: {
      id: "motionAtlas.expiring-lease.controls.showLifetime",
      message: "showLifetime",
    },
    kind: "boolean",
    help: {
      id: "motionAtlas.expiring-lease.controls.showLifetime.help",
      message:
        "Show the collar and supplied lifetime. When hidden, the authored expiry still returns the token but makes no quantity visible.",
    },
  },
  {
    path: "showLabels",
    label: {
      id: "motionAtlas.expiring-lease.controls.showLabels",
      message: "showLabels",
    },
    kind: "boolean",
    help: {
      id: "motionAtlas.expiring-lease.controls.showLabels.help",
      message: "Show participant, permission, lifetime, and state text.",
    },
  },
];

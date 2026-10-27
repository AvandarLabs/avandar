import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive serializable controls retain collection and numeric bounds. */
export const CONTROLS: StockControl[] = [
  {
    path: "zones",
    label: {
      id: "motionAtlas.street-shade-installation.controls.zones.label",
      message: "zones",
    },
    kind: "collection",
    minItems: 1,
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
          maxLength: 26,
        },
        areaM2: {
          type: "number",
          exclusiveMinimum: 0,
          maximum: 10000,
        },
        existingShadeM2: {
          type: "number",
          minimum: 0,
          maximum: 10000,
        },
      },
      required: ["id", "label", "areaM2", "existingShadeM2"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.street-shade-installation.controls.zones.id.label",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 20,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.street-shade-installation.controls.zones.label.label",
          message: "label",
        },
        kind: "text",
        minLength: 0,
        maxLength: 26,
      },
      {
        path: "areaM2",
        label: {
          id: "motionAtlas.street-shade-installation.controls.zones.areaM2.label",
          message: "areaM2",
        },
        kind: "number",
        min: 0,
        max: 10000,
        help: {
          id: "motionAtlas.street-shade-installation.controls.zones.areaM2.help",
          message: "Strictly positive; zero is rejected.",
        },
      },
      {
        path: "existingShadeM2",
        label: {
          id: "motionAtlas.street-shade-installation.controls.zones.existingShadeM2.label",
          message: "existingShadeM2",
        },
        kind: "number",
        min: 0,
        max: 10000,
      },
    ],
  },
  {
    path: "installations",
    label: {
      id: "motionAtlas.street-shade-installation.controls.installations.label",
      message: "installations",
    },
    kind: "collection",
    minItems: 1,
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
          maxLength: 28,
        },
        zoneId: {
          type: "string",
          minLength: 0,
          maxLength: 20,
        },
        kind: {
          type: "string",
          enum: ["awning", "tree-canopy"],
        },
        addedShadeM2: {
          type: "number",
          minimum: 0,
          maximum: 10000,
        },
      },
      required: ["id", "label", "zoneId", "kind", "addedShadeM2"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.street-shade-installation.controls.installations.id.label",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 20,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.street-shade-installation.controls.installations.label.label",
          message: "label",
        },
        kind: "text",
        minLength: 0,
        maxLength: 28,
      },
      {
        path: "zoneId",
        label: {
          id: "motionAtlas.street-shade-installation.controls.installations.zoneId.label",
          message: "zoneId",
        },
        kind: "select",
        optionsFrom: {
          path: "zones",
          valueKey: "id",
          labelKey: "label",
        },
      },
      {
        path: "kind",
        label: {
          id: "motionAtlas.street-shade-installation.controls.installations.kind.label",
          message: "kind",
        },
        kind: "select",
        options: [
          {
            value: "awning",
            label: {
              id: "motionAtlas.street-shade-installation.controls.installations.kind.awning",
              message: "awning",
            },
          },
          {
            value: "tree-canopy",
            label: {
              id: "motionAtlas.street-shade-installation.controls.installations.kind.tree-canopy",
              message: "tree-canopy",
            },
          },
        ],
      },
      {
        path: "addedShadeM2",
        label: {
          id: "motionAtlas.street-shade-installation.controls.installations.addedShadeM2.label",
          message: "addedShadeM2",
        },
        kind: "number",
        min: 0,
        max: 10000,
      },
    ],
  },
  {
    path: "referenceCondition",
    label: {
      id: "motionAtlas.street-shade-installation.controls.referenceCondition.label",
      message: "referenceCondition",
    },
    kind: "text",
    minLength: 1,
    maxLength: 42,
  },
  {
    path: "decision",
    label: {
      id: "motionAtlas.street-shade-installation.controls.decision.label",
      message: "decision",
    },
    kind: "object",
    controls: [
      {
        path: "actorLabel",
        label: {
          id: "motionAtlas.street-shade-installation.controls.decision.actorLabel.label",
          message: "actorLabel",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
      {
        path: "actionLabel",
        label: {
          id: "motionAtlas.street-shade-installation.controls.decision.actionLabel.label",
          message: "actionLabel",
        },
        kind: "text",
        minLength: 1,
        maxLength: 32,
      },
      {
        path: "stage",
        label: {
          id: "motionAtlas.street-shade-installation.controls.decision.stage.label",
          message: "stage",
        },
        kind: "select",
        options: [
          {
            value: "proposal",
            label: {
              id: "motionAtlas.street-shade-installation.controls.decision.stage.proposal",
              message: "proposal",
            },
          },
          {
            value: "installed",
            label: {
              id: "motionAtlas.street-shade-installation.controls.decision.stage.installed",
              message: "installed",
            },
          },
        ],
      },
    ],
  },
  {
    path: "showAreaBalance",
    label: {
      id: "motionAtlas.street-shade-installation.controls.showAreaBalance.label",
      message: "showAreaBalance",
    },
    kind: "boolean",
  },
  {
    path: "copy",
    label: {
      id: "motionAtlas.street-shade-installation.controls.copy.label",
      message: "copy",
    },
    kind: "object",
    controls: [
      {
        path: "map",
        label: {
          id: "motionAtlas.street-shade-installation.controls.copy.map.label",
          message: "map",
        },
        kind: "text",
        minLength: 0,
        maxLength: 28,
      },
      {
        path: "existing",
        label: {
          id: "motionAtlas.street-shade-installation.controls.copy.existing.label",
          message: "existing",
        },
        kind: "text",
        minLength: 0,
        maxLength: 28,
      },
      {
        path: "added",
        label: {
          id: "motionAtlas.street-shade-installation.controls.copy.added.label",
          message: "added",
        },
        kind: "text",
        minLength: 0,
        maxLength: 28,
      },
      {
        path: "shaded",
        label: {
          id: "motionAtlas.street-shade-installation.controls.copy.shaded.label",
          message: "shaded",
        },
        kind: "text",
        minLength: 0,
        maxLength: 28,
      },
      {
        path: "unshaded",
        label: {
          id: "motionAtlas.street-shade-installation.controls.copy.unshaded.label",
          message: "unshaded",
        },
        kind: "text",
        minLength: 0,
        maxLength: 28,
      },
      {
        path: "proposal",
        label: {
          id: "motionAtlas.street-shade-installation.controls.copy.proposal.label",
          message: "proposal",
        },
        kind: "text",
        minLength: 0,
        maxLength: 28,
      },
      {
        path: "installed",
        label: {
          id: "motionAtlas.street-shade-installation.controls.copy.installed.label",
          message: "installed",
        },
        kind: "text",
        minLength: 0,
        maxLength: 28,
      },
      {
        path: "unit",
        label: {
          id: "motionAtlas.street-shade-installation.controls.copy.unit.label",
          message: "unit",
        },
        kind: "text",
        minLength: 0,
        maxLength: 8,
      },
      {
        path: "disclaimer",
        label: {
          id: "motionAtlas.street-shade-installation.controls.copy.disclaimer.label",
          message: "disclaimer",
        },
        kind: "text",
        minLength: 0,
        maxLength: 48,
      },
    ],
  },
];

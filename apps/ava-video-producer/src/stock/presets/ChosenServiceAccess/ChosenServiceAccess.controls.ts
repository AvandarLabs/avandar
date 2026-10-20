import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable bounded recursive authoring controls. */
export const CONTROLS: StockControl[] = [
  {
    path: "services",
    label: {
      id: "motionAtlas.chosen-service-access.controls.services.label",
      message: "services",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 3,
    itemSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          minLength: 0,
          maxLength: 24,
        },
        label: {
          type: "string",
          minLength: 0,
          maxLength: 26,
        },
        symbol: {
          type: "string",
          enum: ["shelter", "information", "water"],
        },
      },
      required: ["id", "label", "symbol"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.chosen-service-access.controls.services.item.id.label",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 24,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.chosen-service-access.controls.services.item.label.label",
          message: "label",
        },
        kind: "text",
        minLength: 0,
        maxLength: 26,
      },
      {
        path: "symbol",
        label: {
          id: "motionAtlas.chosen-service-access.controls.services.item.symbol.label",
          message: "symbol",
        },
        kind: "select",
        options: [
          {
            value: "shelter",
            label: {
              id: "motionAtlas.chosen-service-access.controls.services.item.symbol.shelter",
              message: "shelter",
            },
          },
          {
            value: "information",
            label: {
              id: "motionAtlas.chosen-service-access.controls.services.item.symbol.information",
              message: "information",
            },
          },
          {
            value: "water",
            label: {
              id: "motionAtlas.chosen-service-access.controls.services.item.symbol.water",
              message: "water",
            },
          },
        ],
      },
    ],
  },
  {
    path: "chosenServiceId",
    label: {
      id: "motionAtlas.chosen-service-access.controls.chosenServiceId.label",
      message: "chosenServiceId",
    },
    kind: "select",
    optionsFrom: {
      path: "services",
      valueKey: "id",
      labelKey: "label",
    },
  },
  {
    path: "accessChange",
    label: {
      id: "motionAtlas.chosen-service-access.controls.accessChange.label",
      message: "accessChange",
    },
    kind: "select",
    options: [
      {
        value: "unfold-ramp",
        label: {
          id: "motionAtlas.chosen-service-access.controls.accessChange.unfold-ramp",
          message: "unfold-ramp",
        },
      },
      {
        value: "clear-entrance",
        label: {
          id: "motionAtlas.chosen-service-access.controls.accessChange.clear-entrance",
          message: "clear-entrance",
        },
      },
    ],
  },
  {
    path: "participantMobility",
    label: {
      id: "motionAtlas.chosen-service-access.controls.participantMobility.label",
      message: "participantMobility",
    },
    kind: "select",
    options: [
      {
        value: "walking",
        label: {
          id: "motionAtlas.chosen-service-access.controls.participantMobility.walking",
          message: "walking",
        },
      },
      {
        value: "wheelchair",
        label: {
          id: "motionAtlas.chosen-service-access.controls.participantMobility.wheelchair",
          message: "wheelchair",
        },
      },
    ],
  },
  {
    path: "labels",
    label: {
      id: "motionAtlas.chosen-service-access.controls.labels.label",
      message: "labels",
    },
    kind: "object",
    controls: [
      {
        path: "participant",
        label: {
          id: "motionAtlas.chosen-service-access.controls.labels.participant.label",
          message: "participant",
        },
        kind: "text",
        minLength: 0,
        maxLength: 24,
      },
      {
        path: "staff",
        label: {
          id: "motionAtlas.chosen-service-access.controls.labels.staff.label",
          message: "staff",
        },
        kind: "text",
        minLength: 0,
        maxLength: 24,
      },
      {
        path: "choice",
        label: {
          id: "motionAtlas.chosen-service-access.controls.labels.choice.label",
          message: "choice",
        },
        kind: "text",
        minLength: 0,
        maxLength: 24,
      },
    ],
  },
  {
    path: "showChoiceLabel",
    label: {
      id: "motionAtlas.chosen-service-access.controls.showChoiceLabel.label",
      message: "showChoiceLabel",
    },
    kind: "boolean",
  },
  {
    path: "scenarioCaption",
    label: {
      id: "motionAtlas.chosen-service-access.controls.scenarioCaption.label",
      message: "scenarioCaption",
    },
    kind: "text",
    minLength: 1,
    maxLength: 48,
  },
];

import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable bounded recursive authoring controls. */
export const CONTROLS: StockControl[] = [
  {
    path: "places",
    label: {
      id: "motionAtlas.community-coordination-table.controls.places.label",
      message: "places",
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
          maxLength: 24,
        },
        label: {
          type: "string",
          minLength: 0,
          maxLength: 24,
        },
        x: {
          type: "number",
          minimum: 0.15,
          maximum: 0.85,
        },
        y: {
          type: "number",
          minimum: 0.15,
          maximum: 0.85,
        },
        requestLabel: {
          type: "string",
          minLength: 0,
          maxLength: 30,
        },
      },
      required: ["id", "label", "x", "y", "requestLabel"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.community-coordination-table.controls.places.item.id.label",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 24,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.community-coordination-table.controls.places.item.label.label",
          message: "label",
        },
        kind: "text",
        minLength: 0,
        maxLength: 24,
      },
      {
        path: "x",
        label: {
          id: "motionAtlas.community-coordination-table.controls.places.item.x.label",
          message: "x",
        },
        kind: "number",
        min: 0.15,
        max: 0.85,
      },
      {
        path: "y",
        label: {
          id: "motionAtlas.community-coordination-table.controls.places.item.y.label",
          message: "y",
        },
        kind: "number",
        min: 0.15,
        max: 0.85,
      },
      {
        path: "requestLabel",
        label: {
          id: "motionAtlas.community-coordination-table.controls.places.item.requestLabel.label",
          message: "requestLabel",
        },
        kind: "text",
        minLength: 0,
        maxLength: 30,
      },
    ],
  },
  {
    path: "teams",
    label: {
      id: "motionAtlas.community-coordination-table.controls.teams.label",
      message: "teams",
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
          maxLength: 24,
        },
        label: {
          type: "string",
          minLength: 0,
          maxLength: 24,
        },
        serviceLabel: {
          type: "string",
          minLength: 0,
          maxLength: 22,
        },
        initialPlaceId: {
          type: "string",
          minLength: 0,
          maxLength: 24,
        },
        agreedPlaceId: {
          type: "string",
          minLength: 0,
          maxLength: 24,
        },
      },
      required: [
        "id",
        "label",
        "serviceLabel",
        "initialPlaceId",
        "agreedPlaceId",
      ],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.community-coordination-table.controls.teams.item.id.label",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 24,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.community-coordination-table.controls.teams.item.label.label",
          message: "label",
        },
        kind: "text",
        minLength: 0,
        maxLength: 24,
      },
      {
        path: "serviceLabel",
        label: {
          id: "motionAtlas.community-coordination-table.controls.teams.item.serviceLabel.label",
          message: "serviceLabel",
        },
        kind: "text",
        minLength: 0,
        maxLength: 22,
      },
      {
        path: "initialPlaceId",
        label: {
          id: "motionAtlas.community-coordination-table.controls.teams.item.initialPlaceId.label",
          message: "initialPlaceId",
        },
        kind: "select",
        optionsFrom: {
          path: "places",
          valueKey: "id",
          labelKey: "label",
        },
      },
      {
        path: "agreedPlaceId",
        label: {
          id: "motionAtlas.community-coordination-table.controls.teams.item.agreedPlaceId.label",
          message: "agreedPlaceId",
        },
        kind: "select",
        optionsFrom: {
          path: "places",
          valueKey: "id",
          labelKey: "label",
        },
      },
    ],
  },
  {
    path: "communityLabel",
    label: {
      id: "motionAtlas.community-coordination-table.controls.communityLabel.label",
      message: "communityLabel",
    },
    kind: "text",
    minLength: 1,
    maxLength: 30,
  },
  {
    path: "planLabels",
    label: {
      id: "motionAtlas.community-coordination-table.controls.planLabels.label",
      message: "planLabels",
    },
    kind: "object",
    controls: [
      {
        path: "initial",
        label: {
          id: "motionAtlas.community-coordination-table.controls.planLabels.initial.label",
          message: "initial",
        },
        kind: "text",
        minLength: 0,
        maxLength: 28,
      },
      {
        path: "agreed",
        label: {
          id: "motionAtlas.community-coordination-table.controls.planLabels.agreed.label",
          message: "agreed",
        },
        kind: "text",
        minLength: 0,
        maxLength: 28,
      },
      {
        path: "unassigned",
        label: {
          id: "motionAtlas.community-coordination-table.controls.planLabels.unassigned.label",
          message: "unassigned",
        },
        kind: "text",
        minLength: 0,
        maxLength: 28,
      },
    ],
  },
  {
    path: "showUnassignedRequests",
    label: {
      id: "motionAtlas.community-coordination-table.controls.showUnassignedRequests.label",
      message: "showUnassignedRequests",
    },
    kind: "boolean",
  },
  {
    path: "markerStyle",
    label: {
      id: "motionAtlas.community-coordination-table.controls.markerStyle.label",
      message: "markerStyle",
    },
    kind: "select",
    options: [
      {
        value: "flags",
        label: {
          id: "motionAtlas.community-coordination-table.controls.markerStyle.flags",
          message: "flags",
        },
      },
      {
        value: "wooden-pieces",
        label: {
          id: "motionAtlas.community-coordination-table.controls.markerStyle.wooden-pieces",
          message: "wooden-pieces",
        },
      },
    ],
  },
  {
    path: "scenarioCaption",
    label: {
      id: "motionAtlas.community-coordination-table.controls.scenarioCaption.label",
      message: "scenarioCaption",
    },
    kind: "text",
    minLength: 1,
    maxLength: 54,
  },
];

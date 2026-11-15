import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable bounded recursive authoring controls. */
export const CONTROLS: StockControl[] = [
  {
    path: "groups",
    label: {
      id: "motionAtlas.voluntary-family-reunion.controls.groups.label",
      message: "groups",
    },
    kind: "collection",
    minItems: 2,
    maxItems: 2,
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
          maxLength: 28,
        },
        members: {
          type: "array",
          items: {
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
                maxLength: 20,
              },
            },
            required: ["id", "label"],
            additionalProperties: false,
          },
          minItems: 1,
          maxItems: 3,
        },
      },
      required: ["id", "label", "members"],
      additionalProperties: false,
    },
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.voluntary-family-reunion.controls.groups.item.id.label",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 24,
      },
      {
        path: "label",
        label: {
          id: "motionAtlas.voluntary-family-reunion.controls.groups.item.label.label",
          message: "label",
        },
        kind: "text",
        minLength: 0,
        maxLength: 28,
      },
      {
        path: "members",
        label: {
          id: "motionAtlas.voluntary-family-reunion.controls.groups.item.members.label",
          message: "members",
        },
        kind: "collection",
        minItems: 1,
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
              maxLength: 20,
            },
          },
          required: ["id", "label"],
          additionalProperties: false,
        },
        itemControls: [
          {
            path: "id",
            label: {
              id: "motionAtlas.voluntary-family-reunion.controls.groups.item.members.item.id.label",
              message: "id",
            },
            kind: "text",
            minLength: 0,
            maxLength: 24,
          },
          {
            path: "label",
            label: {
              id: "motionAtlas.voluntary-family-reunion.controls.groups.item.members.item.label.label",
              message: "label",
            },
            kind: "text",
            minLength: 0,
            maxLength: 20,
          },
        ],
      },
    ],
  },
  {
    path: "meetingLabel",
    label: {
      id: "motionAtlas.voluntary-family-reunion.controls.meetingLabel.label",
      message: "meetingLabel",
    },
    kind: "text",
    minLength: 1,
    maxLength: 36,
  },
  {
    path: "invitationLabels",
    label: {
      id: "motionAtlas.voluntary-family-reunion.controls.invitationLabels.label",
      message: "invitationLabels",
    },
    kind: "object",
    controls: [
      {
        path: "heading",
        label: {
          id: "motionAtlas.voluntary-family-reunion.controls.invitationLabels.heading.label",
          message: "heading",
        },
        kind: "text",
        minLength: 0,
        maxLength: 26,
      },
      {
        path: "acceptance",
        label: {
          id: "motionAtlas.voluntary-family-reunion.controls.invitationLabels.acceptance.label",
          message: "acceptance",
        },
        kind: "text",
        minLength: 0,
        maxLength: 26,
      },
    ],
  },
  {
    path: "greeting",
    label: {
      id: "motionAtlas.voluntary-family-reunion.controls.greeting.label",
      message: "greeting",
    },
    kind: "select",
    options: [
      {
        value: "wave",
        label: {
          id: "motionAtlas.voluntary-family-reunion.controls.greeting.wave",
          message: "wave",
        },
      },
      {
        value: "open-arms",
        label: {
          id: "motionAtlas.voluntary-family-reunion.controls.greeting.open-arms",
          message: "open-arms",
        },
      },
    ],
  },
  {
    path: "showMemberLabels",
    label: {
      id: "motionAtlas.voluntary-family-reunion.controls.showMemberLabels.label",
      message: "showMemberLabels",
    },
    kind: "boolean",
  },
  {
    path: "scenarioCaption",
    label: {
      id: "motionAtlas.voluntary-family-reunion.controls.scenarioCaption.label",
      message: "scenarioCaption",
    },
    kind: "text",
    minLength: 1,
    maxLength: 54,
  },
];

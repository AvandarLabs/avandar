import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable people editor. */
export const PEOPLE_CONTROL: StockControl = {
  help: {
    id: "motionAtlas.private-case-conversation.controls.people.help",
    message:
      "Name the three distinct roles in the room. Exactly 3 people, one per role; unique IDs <= 16 characters; labels <= 24 characters; no demographic inference from role.",
  },
  path: "people",
  kind: "collection",
  minItems: 3,
  maxItems: 3,
  itemControls: [
    {
      path: "id",
      kind: "text",
      minLength: 0,
      maxLength: 16,
      label: {
        id: "motionAtlas.private-case-conversation.controls.people.id",
        message: "id",
      },
    },
    {
      path: "label",
      kind: "text",
      minLength: 0,
      maxLength: 24,
      label: {
        id: "motionAtlas.private-case-conversation.controls.people.label",
        message: "label",
      },
    },
    {
      path: "role",
      kind: "select",
      options: [
        {
          value: "participant",
          label: {
            id: "motionAtlas.private-case-conversation.controls.people.role.0",
            message: "participant",
          },
        },
        {
          value: "worker",
          label: {
            id: "motionAtlas.private-case-conversation.controls.people.role.1",
            message: "worker",
          },
        },
        {
          value: "supporter",
          label: {
            id: "motionAtlas.private-case-conversation.controls.people.role.2",
            message: "supporter",
          },
        },
      ],
      label: {
        id: "motionAtlas.private-case-conversation.controls.people.role",
        message: "role",
      },
    },
  ],
  label: {
    id: "motionAtlas.private-case-conversation.controls.people",
    message: "people",
  },
  itemSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        minLength: 0,
        maxLength: 16,
      },
      label: {
        type: "string",
        minLength: 0,
        maxLength: 24,
      },
      role: {
        type: "string",
        enum: ["participant", "worker", "supporter"],
      },
    },
    required: ["id", "label", "role"],
    additionalProperties: false,
  },
};

import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for turns. */
export const TURNS_CONTROL: StockControl = {
  path: "turns",
  label: {
    id: "motionAtlas.interpreted-case-dialogue.controls.turns",
    message: "turns",
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
        maxLength: 16,
      },
      speaker: {
        type: "string",
        enum: ["participant", "worker"],
      },
      originalText: {
        type: "string",
        minLength: 0,
        maxLength: 48,
      },
      interpretedText: {
        type: "string",
        minLength: 0,
        maxLength: 48,
      },
    },
    required: ["id", "speaker", "originalText", "interpretedText"],
    additionalProperties: false,
  },
  itemControls: [
    {
      path: "id",
      label: {
        id: "motionAtlas.interpreted-case-dialogue.controls.turns.id",
        message: "id",
      },
      kind: "text",
      minLength: 0,
      maxLength: 16,
    },
    {
      path: "speaker",
      label: {
        id: "motionAtlas.interpreted-case-dialogue.controls.turns.speaker",
        message: "speaker",
      },
      kind: "select",
      options: [
        {
          value: "participant",
          label: {
            id: "motionAtlas.interpreted-case-dialogue.controls.turns.speaker.0",
            message: "participant",
          },
        },
        {
          value: "worker",
          label: {
            id: "motionAtlas.interpreted-case-dialogue.controls.turns.speaker.1",
            message: "worker",
          },
        },
      ],
    },
    {
      path: "originalText",
      label: {
        id: "motionAtlas.interpreted-case-dialogue.controls.turns.originalText",
        message: "originalText",
      },
      kind: "text",
      minLength: 0,
      maxLength: 48,
    },
    {
      path: "interpretedText",
      label: {
        id: "motionAtlas.interpreted-case-dialogue.controls.turns.interpretedText",
        message: "interpretedText",
      },
      kind: "text",
      minLength: 0,
      maxLength: 48,
    },
  ],
  help: {
    id: "motionAtlas.interpreted-case-dialogue.controls.turns.help",
    message:
      "Supply the original and interpreted wording for each conversational turn. Exactly 2 turns, participant then worker; unique IDs <= 16 characters; each text <= 48 characters; fictional defaults repeat English under demo language labels; real translations must be supplied and verified by the author.",
  },
};

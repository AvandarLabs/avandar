import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for requests. */
export const REQUESTS_CONTROL: StockControl = {
  path: "requests",
  label: {
    id: "motionAtlas.shared-workshop-booking.controls.requests",
    message: "requests",
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
        maxLength: 16,
      },
      participant: {
        type: "string",
        minLength: 0,
        maxLength: 24,
      },
      requestedSlotId: {
        type: "string",
        minLength: 0,
        maxLength: 16,
      },
      agreedSlotId: {
        anyOf: [{ type: "string", maxLength: 16 }, { type: "null" }],
      },
    },
    required: ["id", "participant", "requestedSlotId", "agreedSlotId"],
    additionalProperties: false,
  },
  itemControls: [
    {
      path: "id",
      label: {
        id: "motionAtlas.shared-workshop-booking.controls.requests.id",
        message: "id",
      },
      kind: "text",
      minLength: 0,
      maxLength: 16,
    },
    {
      path: "participant",
      label: {
        id: "motionAtlas.shared-workshop-booking.controls.requests.participant",
        message: "participant",
      },
      kind: "text",
      minLength: 0,
      maxLength: 24,
    },
    {
      path: "requestedSlotId",
      label: {
        id: "motionAtlas.shared-workshop-booking.controls.requests.requestedSlotId",
        message: "requestedSlotId",
      },
      kind: "select",
      optionsFrom: {
        path: "timeSlots",
        valueKey: "id",
        labelKey: "label",
      },
    },
    {
      path: "agreedSlotId",
      label: {
        id: "motionAtlas.shared-workshop-booking.controls.requests.agreedSlotId",
        message: "agreedSlotId",
      },
      kind: "select",
      optionsFrom: {
        path: "timeSlots",
        valueKey: "id",
        labelKey: "label",
      },
      nullable: true,
    },
  ],
  help: {
    id: "motionAtlas.shared-workshop-booking.controls.requests.help",
    message:
      "Bind each participant's request to an authored booking or unresolved result. 2..3 requests; unique IDs <= 16 characters; participant <= 24 characters; slot references must exist; non-null agreed slot IDs must be unique; at least two requested slots overlap.",
  },
};

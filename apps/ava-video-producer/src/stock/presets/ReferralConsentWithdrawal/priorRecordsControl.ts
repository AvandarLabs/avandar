import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable priorRecords editor. */
export const PRIOR_RECORDS_CONTROL: StockControl = {
  help: {
    id: "motionAtlas.referral-consent-withdrawal.controls.priorRecords.help",
    message:
      "Keep supplied historical sharing records separate from future permission. 0..2 records; unique IDs <= 16 characters; recipient/date <= 24 characters; summary <= 30 characters; records never disappear as an effect of withdrawal.",
  },
  path: "priorRecords",
  kind: "collection",
  minItems: 0,
  maxItems: 2,
  itemControls: [
    {
      path: "id",
      kind: "text",
      minLength: 0,
      maxLength: 16,
      label: {
        id: "motionAtlas.referral-consent-withdrawal.controls.priorRecords.id",
        message: "id",
      },
    },
    {
      path: "recipient",
      kind: "text",
      minLength: 0,
      maxLength: 24,
      label: {
        id: "motionAtlas.referral-consent-withdrawal.controls.priorRecords.recipient",
        message: "recipient",
      },
    },
    {
      path: "dateLabel",
      kind: "text",
      minLength: 0,
      maxLength: 24,
      label: {
        id: "motionAtlas.referral-consent-withdrawal.controls.priorRecords.dateLabel",
        message: "dateLabel",
      },
    },
    {
      path: "summary",
      kind: "text",
      minLength: 0,
      maxLength: 30,
      label: {
        id: "motionAtlas.referral-consent-withdrawal.controls.priorRecords.summary",
        message: "summary",
      },
    },
  ],
  label: {
    id: "motionAtlas.referral-consent-withdrawal.controls.priorRecords",
    message: "priorRecords",
  },
  itemSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        minLength: 0,
        maxLength: 16,
      },
      recipient: {
        type: "string",
        minLength: 0,
        maxLength: 24,
      },
      dateLabel: {
        type: "string",
        minLength: 0,
        maxLength: 24,
      },
      summary: {
        type: "string",
        minLength: 0,
        maxLength: 30,
      },
    },
    required: ["id", "recipient", "dateLabel", "summary"],
    additionalProperties: false,
  },
};

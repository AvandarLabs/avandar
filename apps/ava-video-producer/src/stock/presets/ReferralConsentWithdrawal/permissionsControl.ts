import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable permissions editor. */
export const PERMISSIONS_CONTROL: StockControl = {
  help: {
    id: "motionAtlas.referral-consent-withdrawal.controls.permissions.help",
    message:
      "Set the separate recipient-and-purpose permissions. 1..3 permissions; unique IDs <= 16 characters; recipient <= 24 characters; purpose <= 28 characters; at least one withdrawn permission.",
  },
  path: "permissions",
  kind: "collection",
  minItems: 1,
  maxItems: 3,
  itemControls: [
    {
      path: "id",
      kind: "text",
      minLength: 0,
      maxLength: 16,
      label: {
        id: "motionAtlas.referral-consent-withdrawal.controls.permissions.id",
        message: "id",
      },
    },
    {
      path: "recipient",
      kind: "text",
      minLength: 0,
      maxLength: 24,
      label: {
        id: "motionAtlas.referral-consent-withdrawal.controls.permissions.recipient",
        message: "recipient",
      },
    },
    {
      path: "purpose",
      kind: "text",
      minLength: 0,
      maxLength: 28,
      label: {
        id: "motionAtlas.referral-consent-withdrawal.controls.permissions.purpose",
        message: "purpose",
      },
    },
    {
      path: "withdrawn",
      kind: "boolean",
      label: {
        id: "motionAtlas.referral-consent-withdrawal.controls.permissions.withdrawn",
        message: "withdrawn",
      },
    },
  ],
  label: {
    id: "motionAtlas.referral-consent-withdrawal.controls.permissions",
    message: "permissions",
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
      purpose: {
        type: "string",
        minLength: 0,
        maxLength: 28,
      },
      withdrawn: {
        type: "boolean",
      },
    },
    required: ["id", "recipient", "purpose", "withdrawn"],
    additionalProperties: false,
  },
};

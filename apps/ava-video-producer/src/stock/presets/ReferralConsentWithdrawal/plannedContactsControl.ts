import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable plannedContacts editor. */
export const PLANNED_CONTACTS_CONTROL: StockControl = {
  help: {
    id: "motionAtlas.referral-consent-withdrawal.controls.plannedContacts.help",
    message:
      "Bind prepared contacts to the permission that controls them. 1..3 contacts; unique IDs <= 16 characters; permission references must exist; labels <= 26 characters; contacts are preparations, not completed events. At least one contact must reference a withdrawn permission.",
  },
  path: "plannedContacts",
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
        id: "motionAtlas.referral-consent-withdrawal.controls.plannedContacts.id",
        message: "id",
      },
    },
    {
      path: "permissionId",
      kind: "select",
      optionsFrom: {
        path: "permissions",
        valueKey: "id",
        labelKey: "recipient",
      },
      label: {
        id: "motionAtlas.referral-consent-withdrawal.controls.plannedContacts.permissionId",
        message: "permissionId",
      },
    },
    {
      path: "label",
      kind: "text",
      minLength: 0,
      maxLength: 26,
      label: {
        id: "motionAtlas.referral-consent-withdrawal.controls.plannedContacts.label",
        message: "label",
      },
    },
  ],
  label: {
    id: "motionAtlas.referral-consent-withdrawal.controls.plannedContacts",
    message: "plannedContacts",
  },
  itemSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        minLength: 0,
        maxLength: 16,
      },
      permissionId: {
        type: "string",
        maxLength: 16,
      },
      label: {
        type: "string",
        minLength: 0,
        maxLength: 26,
      },
    },
    required: ["id", "permissionId", "label"],
    additionalProperties: false,
  },
};

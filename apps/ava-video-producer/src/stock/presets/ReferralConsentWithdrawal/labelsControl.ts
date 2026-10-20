import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable labels editor. */
export const LABELS_CONTROL: StockControl = {
  help: {
    id: "motionAtlas.referral-consent-withdrawal.controls.labels.help",
    message:
      "Set every permission, tray and record heading. Each label <= 30 characters.",
  },
  path: "labels",
  kind: "object",
  controls: [
    {
      path: "permitted",
      kind: "text",
      minLength: 0,
      maxLength: 30,
      label: {
        id: "motionAtlas.referral-consent-withdrawal.controls.labels.permitted",
        message: "permitted",
      },
    },
    {
      path: "withdrawn",
      kind: "text",
      minLength: 0,
      maxLength: 30,
      label: {
        id: "motionAtlas.referral-consent-withdrawal.controls.labels.withdrawn",
        message: "withdrawn",
      },
    },
    {
      path: "held",
      kind: "text",
      minLength: 0,
      maxLength: 30,
      label: {
        id: "motionAtlas.referral-consent-withdrawal.controls.labels.held",
        message: "held",
      },
    },
    {
      path: "history",
      kind: "text",
      minLength: 0,
      maxLength: 30,
      label: {
        id: "motionAtlas.referral-consent-withdrawal.controls.labels.history",
        message: "history",
      },
    },
    {
      path: "example",
      kind: "text",
      minLength: 0,
      maxLength: 30,
      label: {
        id: "motionAtlas.referral-consent-withdrawal.controls.labels.example",
        message: "example",
      },
    },
  ],
  label: {
    id: "motionAtlas.referral-consent-withdrawal.controls.labels",
    message: "labels",
  },
};

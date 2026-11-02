import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable people editor. */
export const PEOPLE_CONTROL: StockControl = {
  help: {
    id: "motionAtlas.referral-consent-withdrawal.controls.people.help",
    message:
      "Label the people making and following the choice. Each label <= 24 characters.",
  },
  path: "people",
  kind: "object",
  controls: [
    {
      path: "participant",
      kind: "text",
      minLength: 0,
      maxLength: 24,
      label: {
        id: "motionAtlas.referral-consent-withdrawal.controls.people.participant",
        message: "participant",
      },
    },
    {
      path: "worker",
      kind: "text",
      minLength: 0,
      maxLength: 24,
      label: {
        id: "motionAtlas.referral-consent-withdrawal.controls.people.worker",
        message: "worker",
      },
    },
  ],
  label: {
    id: "motionAtlas.referral-consent-withdrawal.controls.people",
    message: "people",
  },
};

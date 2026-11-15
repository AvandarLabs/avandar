import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable showPurpose editor. */
export const SHOW_PURPOSE_CONTROL: StockControl = {
  help: {
    id: "motionAtlas.referral-consent-withdrawal.controls.showPurpose.help",
    message:
      "Display the purpose alongside each recipient. Boolean; hiding the text does not broaden the permission scope.",
  },
  path: "showPurpose",
  kind: "boolean",
  label: {
    id: "motionAtlas.referral-consent-withdrawal.controls.showPurpose",
    message: "showPurpose",
  },
};

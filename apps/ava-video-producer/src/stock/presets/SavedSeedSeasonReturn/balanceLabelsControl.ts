import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for balanceLabels. */
export const BALANCE_LABELS_CONTROL: StockControl = {
  path: "balanceLabels",
  label: {
    id: "motionAtlas.saved-seed-season-return.controls.balanceLabels",
    message: "balanceLabels",
  },
  kind: "object",
  controls: [
    {
      path: "currentUse",
      label: {
        id: "motionAtlas.saved-seed-season-return.controls.balanceLabels.currentUse",
        message: "currentUse",
      },
      kind: "text",
      minLength: 1,
      maxLength: 28,
    },
    {
      path: "reserved",
      label: {
        id: "motionAtlas.saved-seed-season-return.controls.balanceLabels.reserved",
        message: "reserved",
      },
      kind: "text",
      minLength: 1,
      maxLength: 28,
    },
    {
      path: "storageLoss",
      label: {
        id: "motionAtlas.saved-seed-season-return.controls.balanceLabels.storageLoss",
        message: "storageLoss",
      },
      kind: "text",
      minLength: 1,
      maxLength: 28,
    },
    {
      path: "sown",
      label: {
        id: "motionAtlas.saved-seed-season-return.controls.balanceLabels.sown",
        message: "sown",
      },
      kind: "text",
      minLength: 1,
      maxLength: 28,
    },
    {
      path: "remaining",
      label: {
        id: "motionAtlas.saved-seed-season-return.controls.balanceLabels.remaining",
        message: "remaining",
      },
      kind: "text",
      minLength: 1,
      maxLength: 28,
    },
  ],
  help: {
    id: "motionAtlas.saved-seed-season-return.controls.balanceLabels.help",
    message:
      "Supplies all material-accounting labels on the mat, jar, loss tray, and furrow. The reserved label applies before sowing and the remaining label after sowing, so the reserved subtotal is never added to final destinations. five required labels, each 1..28 characters; currentUse must describe the non-reserved portion without implying a sale or consumption event that is not shown",
  },
};

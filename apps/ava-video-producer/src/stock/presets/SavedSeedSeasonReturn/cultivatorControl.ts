import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for cultivator. */
export const CULTIVATOR_CONTROL: StockControl = {
  path: "cultivator",
  label: {
    id: "motionAtlas.saved-seed-season-return.controls.cultivator",
    message: "cultivator",
  },
  kind: "object",
  controls: [
    {
      path: "label",
      label: {
        id: "motionAtlas.saved-seed-season-return.controls.cultivator.label",
        message: "label",
      },
      kind: "text",
      minLength: 1,
      maxLength: 28,
    },
    {
      path: "mode",
      label: {
        id: "motionAtlas.saved-seed-season-return.controls.cultivator.mode",
        message: "mode",
      },
      kind: "select",
      options: [
        {
          value: "household",
          label: {
            id: "motionAtlas.saved-seed-season-return.controls.cultivator.mode.0",
            message: "household",
          },
        },
        {
          value: "cooperative",
          label: {
            id: "motionAtlas.saved-seed-season-return.controls.cultivator.mode.1",
            message: "cooperative",
          },
        },
      ],
    },
    {
      path: "choiceLabel",
      label: {
        id: "motionAtlas.saved-seed-season-return.controls.cultivator.choiceLabel",
        message: "choiceLabel",
      },
      kind: "text",
      minLength: 1,
      maxLength: 40,
    },
  ],
  help: {
    id: "motionAtlas.saved-seed-season-return.controls.cultivator.help",
    message:
      "Names the decision maker, selects a household or cooperative silhouette, and supplies the visible statement of its seed-retention choice. label 1..28 characters; mode household or cooperative; choiceLabel 1..40 characters; any quantities stated in choiceLabel must agree with crop; silhouette count is decorative and does not represent membership",
  },
};

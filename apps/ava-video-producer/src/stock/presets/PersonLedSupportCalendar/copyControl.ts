import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for copy. */
export const COPY_CONTROL: StockControl = {
  path: "copy",
  label: {
    id: "motionAtlas.person-led-support-calendar.controls.copy",
    message: "copy",
  },
  kind: "object",
  controls: [
    {
      path: "goal",
      label: {
        id: "motionAtlas.person-led-support-calendar.controls.copy.goal",
        message: "goal",
      },
      kind: "text",
      minLength: 0,
      maxLength: 36,
    },
    {
      path: "agreement",
      label: {
        id: "motionAtlas.person-led-support-calendar.controls.copy.agreement",
        message: "agreement",
      },
      kind: "text",
      minLength: 0,
      maxLength: 30,
    },
    {
      path: "example",
      label: {
        id: "motionAtlas.person-led-support-calendar.controls.copy.example",
        message: "example",
      },
      kind: "text",
      minLength: 0,
      maxLength: 30,
    },
  ],
  help: {
    id: "motionAtlas.person-led-support-calendar.controls.copy.help",
    message:
      "Set the goal, agreement annotation and example label. Goal <= 36 characters; other labels <= 30 characters.",
  },
};

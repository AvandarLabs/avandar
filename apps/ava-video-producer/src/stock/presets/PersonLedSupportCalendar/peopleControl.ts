import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for people. */
export const PEOPLE_CONTROL: StockControl = {
  path: "people",
  label: {
    id: "motionAtlas.person-led-support-calendar.controls.people",
    message: "people",
  },
  kind: "object",
  controls: [
    {
      path: "participant",
      label: {
        id: "motionAtlas.person-led-support-calendar.controls.people.participant",
        message: "participant",
      },
      kind: "text",
      minLength: 1,
      maxLength: 24,
    },
    {
      path: "worker",
      label: {
        id: "motionAtlas.person-led-support-calendar.controls.people.worker",
        message: "worker",
      },
      kind: "text",
      minLength: 1,
      maxLength: 24,
    },
  ],
  help: {
    id: "motionAtlas.person-led-support-calendar.controls.people.help",
    message:
      "Name the two people at the planner. Each label 1..24 characters; fictional defaults.",
  },
};

import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable people editor. */
export const PEOPLE_CONTROL: StockControl = {
  help: {
    id: "motionAtlas.grievance-remedy-retest.controls.people.help",
    message:
      "Label the person raising the issue and the person repairing it. Each label <= 26 characters.",
  },
  path: "people",
  kind: "object",
  controls: [
    {
      path: "participant",
      kind: "text",
      minLength: 0,
      maxLength: 26,
      label: {
        id: "motionAtlas.grievance-remedy-retest.controls.people.participant",
        message: "participant",
      },
    },
    {
      path: "worker",
      kind: "text",
      minLength: 0,
      maxLength: 26,
      label: {
        id: "motionAtlas.grievance-remedy-retest.controls.people.worker",
        message: "worker",
      },
    },
  ],
  label: {
    id: "motionAtlas.grievance-remedy-retest.controls.people",
    message: "people",
  },
};

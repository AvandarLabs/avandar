import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable labels editor. */
export const LABELS_CONTROL: StockControl = {
  help: {
    id: "motionAtlas.grievance-remedy-retest.controls.labels.help",
    message:
      "Set all complaint, repair, test and response text. Each label <= 34 characters; issue and repair copy must match the selected object.",
  },
  path: "labels",
  kind: "object",
  controls: [
    {
      path: "issue",
      kind: "text",
      minLength: 0,
      maxLength: 34,
      label: {
        id: "motionAtlas.grievance-remedy-retest.controls.labels.issue",
        message: "issue",
      },
    },
    {
      path: "repair",
      kind: "text",
      minLength: 0,
      maxLength: 34,
      label: {
        id: "motionAtlas.grievance-remedy-retest.controls.labels.repair",
        message: "repair",
      },
    },
    {
      path: "test",
      kind: "text",
      minLength: 0,
      maxLength: 34,
      label: {
        id: "motionAtlas.grievance-remedy-retest.controls.labels.test",
        message: "test",
      },
    },
    {
      path: "accepted",
      kind: "text",
      minLength: 0,
      maxLength: 34,
      label: {
        id: "motionAtlas.grievance-remedy-retest.controls.labels.accepted",
        message: "accepted",
      },
    },
    {
      path: "notAccepted",
      kind: "text",
      minLength: 0,
      maxLength: 34,
      label: {
        id: "motionAtlas.grievance-remedy-retest.controls.labels.notAccepted",
        message: "notAccepted",
      },
    },
    {
      path: "pending",
      kind: "text",
      minLength: 0,
      maxLength: 34,
      label: {
        id: "motionAtlas.grievance-remedy-retest.controls.labels.pending",
        message: "pending",
      },
    },
    {
      path: "example",
      kind: "text",
      minLength: 0,
      maxLength: 34,
      label: {
        id: "motionAtlas.grievance-remedy-retest.controls.labels.example",
        message: "example",
      },
    },
  ],
  label: {
    id: "motionAtlas.grievance-remedy-retest.controls.labels",
    message: "labels",
  },
};

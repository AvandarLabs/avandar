import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable object editor. */
export const OBJECT_CONTROL: StockControl = {
  help: {
    id: "motionAtlas.grievance-remedy-retest.controls.object.help",
    message:
      "Choose the physical object and its concrete test action. Kind selects close/open or switch/light choreography; label <= 24 characters.",
  },
  path: "object",
  kind: "object",
  controls: [
    {
      path: "kind",
      kind: "select",
      options: [
        {
          value: "locker-latch",
          label: {
            id: "motionAtlas.grievance-remedy-retest.controls.object.kind.0",
            message: "locker-latch",
          },
        },
        {
          value: "desk-lamp",
          label: {
            id: "motionAtlas.grievance-remedy-retest.controls.object.kind.1",
            message: "desk-lamp",
          },
        },
      ],
      label: {
        id: "motionAtlas.grievance-remedy-retest.controls.object.kind",
        message: "kind",
      },
    },
    {
      path: "label",
      kind: "text",
      minLength: 0,
      maxLength: 24,
      label: {
        id: "motionAtlas.grievance-remedy-retest.controls.object.label",
        message: "label",
      },
    },
  ],
  label: {
    id: "motionAtlas.grievance-remedy-retest.controls.object",
    message: "object",
  },
};

import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for labels. */
export const LABELS_CONTROL: StockControl = {
  path: "labels",
  label: {
    id: "motionAtlas.shared-workshop-booking.controls.labels",
    message: "labels",
  },
  kind: "object",
  controls: [
    {
      path: "requested",
      label: {
        id: "motionAtlas.shared-workshop-booking.controls.labels.requested",
        message: "requested",
      },
      kind: "text",
      minLength: 0,
      maxLength: 30,
    },
    {
      path: "agreed",
      label: {
        id: "motionAtlas.shared-workshop-booking.controls.labels.agreed",
        message: "agreed",
      },
      kind: "text",
      minLength: 0,
      maxLength: 30,
    },
    {
      path: "unresolved",
      label: {
        id: "motionAtlas.shared-workshop-booking.controls.labels.unresolved",
        message: "unresolved",
      },
      kind: "text",
      minLength: 0,
      maxLength: 30,
    },
    {
      path: "example",
      label: {
        id: "motionAtlas.shared-workshop-booking.controls.labels.example",
        message: "example",
      },
      kind: "text",
      minLength: 0,
      maxLength: 30,
    },
  ],
  help: {
    id: "motionAtlas.shared-workshop-booking.controls.labels.help",
    message:
      "Set the request and booking annotations. Each label <= 30 characters.",
  },
};

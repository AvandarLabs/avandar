import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for machine. */
export const MACHINE_CONTROL: StockControl = {
  path: "machine",
  label: {
    id: "motionAtlas.shared-workshop-booking.controls.machine",
    message: "machine",
  },
  kind: "object",
  controls: [
    {
      path: "kind",
      label: {
        id: "motionAtlas.shared-workshop-booking.controls.machine.kind",
        message: "kind",
      },
      kind: "select",
      options: [
        {
          value: "sewing-machine",
          label: {
            id: "motionAtlas.shared-workshop-booking.controls.machine.kind.0",
            message: "sewing-machine",
          },
        },
        {
          value: "workbench",
          label: {
            id: "motionAtlas.shared-workshop-booking.controls.machine.kind.1",
            message: "workbench",
          },
        },
      ],
    },
    {
      path: "label",
      label: {
        id: "motionAtlas.shared-workshop-booking.controls.machine.label",
        message: "label",
      },
      kind: "text",
      minLength: 0,
      maxLength: 28,
    },
  ],
  help: {
    id: "motionAtlas.shared-workshop-booking.controls.machine.help",
    message:
      "Choose and label the single shared productive asset. Kind selects the physical work gesture; label <= 28 characters; exactly one asset is shown.",
  },
};

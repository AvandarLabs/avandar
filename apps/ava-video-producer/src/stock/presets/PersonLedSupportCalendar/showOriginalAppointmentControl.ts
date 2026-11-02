import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for showOriginalAppointment. */
export const SHOW_ORIGINAL_APPOINTMENT_CONTROL: StockControl = {
  path: "showOriginalAppointment",
  label: {
    id: "motionAtlas.person-led-support-calendar.controls.showOriginalAppointment",
    message: "showOriginalAppointment",
  },
  kind: "boolean",
  help: {
    id: "motionAtlas.person-led-support-calendar.controls.showOriginalAppointment.help",
    message:
      "Retain a dotted impression of the original proposed time. Boolean; the original impression is a proposal, not a second booking.",
  },
};

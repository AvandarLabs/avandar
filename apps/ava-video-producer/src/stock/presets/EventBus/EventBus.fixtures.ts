import type { StockContract } from "../../contracts/StockContract.types";
import type { EventBusInput } from "./EventBus.schema";

/** Complete fictional example used only when input is omitted. */
export const EVENT_BUS_DEFAULT_INPUT: EventBusInput = {
  producers: ["Create", "Update", "Archive"],
  subscribers: ["Log", "Index", "Notify"],
  heading: "EVENT BUS",
  showPackets: true,
};

/** The maximum supported collection density in the authored layout. */
export const eventBusDenseInput: EventBusInput = { ...EVENT_BUS_DEFAULT_INPUT };

/** A complete smaller or differently selected authored example. */
export const eventBusChangedInput: EventBusInput = {
  ...EVENT_BUS_DEFAULT_INPUT,
  producers: ["Submit"],
  subscribers: ["Review", "Audit"],
  heading: "AUTHORED BUS",
  showPackets: false,
};

/** Named examples available to editors and semantic regression checks. */
export const eventBusFixtures: StockContract<
  typeof EVENT_BUS_DEFAULT_INPUT
>["fixtures"] = [
  { id: "default", input: EVENT_BUS_DEFAULT_INPUT },
  { id: "dense", input: eventBusDenseInput },
  { id: "changed", input: eventBusChangedInput },
];

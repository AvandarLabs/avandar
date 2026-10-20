import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for registeredPeople. */
export const REGISTERED_PEOPLE_CONTROL: StockControl = {
  path: "registeredPeople",
  label: {
    id: "motionAtlas.shelter-usable-area-capacity.controls.registeredPeople",
    message: "registeredPeople",
  },
  kind: "number",
  min: 0,
  max: 40,
  step: 1,
  help: {
    id: "motionAtlas.shelter-usable-area-capacity.controls.registeredPeople.help",
    message:
      "Supplied demand count compared with calculated place equivalents. Integer 0..40; a single input owns this count; show shortfall max(people - equivalents, 0) and spare equivalents separately.",
  },
};

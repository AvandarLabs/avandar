import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for structure. */
export const STRUCTURE_CONTROL: StockControl = {
  path: "structure",
  label: {
    id: "motionAtlas.public-works-measurement-check.controls.structure",
    message: "structure",
  },
  kind: "select",
  options: [
    {
      value: "low-wall",
      label: {
        id: "motionAtlas.public-works-measurement-check.controls.structure.0",
        message: "low-wall",
      },
    },
    {
      value: "handrail",
      label: {
        id: "motionAtlas.public-works-measurement-check.controls.structure.1",
        message: "handrail",
      },
    },
  ],
  help: {
    id: "motionAtlas.public-works-measurement-check.controls.structure.help",
    message:
      "Choose the physical structure being measured. Low-wall or handrail; geometry is schematic and not a real site.",
  },
};

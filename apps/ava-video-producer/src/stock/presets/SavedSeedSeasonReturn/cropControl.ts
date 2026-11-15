import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for crop. */
export const CROP_CONTROL: StockControl = {
  path: "crop",
  label: {
    id: "motionAtlas.saved-seed-season-return.controls.crop",
    message: "crop",
  },
  kind: "object",
  controls: [
    {
      path: "label",
      label: {
        id: "motionAtlas.saved-seed-season-return.controls.crop.label",
        message: "label",
      },
      kind: "text",
      minLength: 1,
      maxLength: 24,
    },
    {
      path: "symbol",
      label: {
        id: "motionAtlas.saved-seed-season-return.controls.crop.symbol",
        message: "symbol",
      },
      kind: "select",
      options: [
        {
          value: "grain",
          label: {
            id: "motionAtlas.saved-seed-season-return.controls.crop.symbol.0",
            message: "grain",
          },
        },
        {
          value: "bean",
          label: {
            id: "motionAtlas.saved-seed-season-return.controls.crop.symbol.1",
            message: "bean",
          },
        },
      ],
    },
    {
      path: "unitLabel",
      label: {
        id: "motionAtlas.saved-seed-season-return.controls.crop.unitLabel",
        message: "unitLabel",
      },
      kind: "text",
      minLength: 1,
      maxLength: 12,
    },
    {
      path: "harvestQuantity",
      label: {
        id: "motionAtlas.saved-seed-season-return.controls.crop.harvestQuantity",
        message: "harvestQuantity",
      },
      kind: "number",
      min: 0,
      max: 10000,
      step: 0.01,
    },
    {
      path: "reservedQuantity",
      label: {
        id: "motionAtlas.saved-seed-season-return.controls.crop.reservedQuantity",
        message: "reservedQuantity",
      },
      kind: "number",
      min: 0,
      max: 10000,
      step: 0.01,
    },
    {
      path: "storageLossQuantity",
      label: {
        id: "motionAtlas.saved-seed-season-return.controls.crop.storageLossQuantity",
        message: "storageLossQuantity",
      },
      kind: "number",
      min: 0,
      max: 10000,
      step: 0.01,
    },
    {
      path: "sownQuantity",
      label: {
        id: "motionAtlas.saved-seed-season-return.controls.crop.sownQuantity",
        message: "sownQuantity",
      },
      kind: "number",
      min: 0,
      max: 10000,
      step: 0.01,
    },
  ],
  help: {
    id: "motionAtlas.saved-seed-season-return.controls.crop.help",
    message:
      "Names one crop and supplies all material quantities. Current use equals harvest minus reserved seed. Remaining seed equals reserved seed minus recorded storage loss minus sown seed. No future harvest is calculated. label 1..24 characters; symbol grain or bean; unitLabel 1..12 characters; finite quantities 0..10000 with at most two decimal places in one common mass unit; harvestQuantity > 0; 0 <= reservedQuantity <= harvestQuantity; 0 <= storageLossQuantity <= reservedQuantity; 0 <= sownQuantity <= reservedQuantity - storageLossQuantity; reject inconsistent values rather than clamp; derived balances use exact decimal arithmetic",
  },
};

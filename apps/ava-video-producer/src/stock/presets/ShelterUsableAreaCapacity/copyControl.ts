import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for copy. */
export const COPY_CONTROL: StockControl = {
  path: "copy",
  label: {
    id: "motionAtlas.shelter-usable-area-capacity.controls.copy",
    message: "copy",
  },
  kind: "object",
  controls: [
    {
      path: "context",
      label: {
        id: "motionAtlas.shelter-usable-area-capacity.controls.copy.context",
        message: "context",
      },
      kind: "text",
      minLength: 0,
      maxLength: 48,
    },
    {
      path: "sleeping",
      label: {
        id: "motionAtlas.shelter-usable-area-capacity.controls.copy.sleeping",
        message: "sleeping",
      },
      kind: "text",
      minLength: 0,
      maxLength: 48,
    },
    {
      path: "circulation",
      label: {
        id: "motionAtlas.shelter-usable-area-capacity.controls.copy.circulation",
        message: "circulation",
      },
      kind: "text",
      minLength: 0,
      maxLength: 48,
    },
    {
      path: "storage",
      label: {
        id: "motionAtlas.shelter-usable-area-capacity.controls.copy.storage",
        message: "storage",
      },
      kind: "text",
      minLength: 0,
      maxLength: 48,
    },
    {
      path: "closed",
      label: {
        id: "motionAtlas.shelter-usable-area-capacity.controls.copy.closed",
        message: "closed",
      },
      kind: "text",
      minLength: 0,
      maxLength: 48,
    },
    {
      path: "gross",
      label: {
        id: "motionAtlas.shelter-usable-area-capacity.controls.copy.gross",
        message: "gross",
      },
      kind: "text",
      minLength: 0,
      maxLength: 48,
    },
    {
      path: "usable",
      label: {
        id: "motionAtlas.shelter-usable-area-capacity.controls.copy.usable",
        message: "usable",
      },
      kind: "text",
      minLength: 0,
      maxLength: 48,
    },
    {
      path: "benchmark",
      label: {
        id: "motionAtlas.shelter-usable-area-capacity.controls.copy.benchmark",
        message: "benchmark",
      },
      kind: "text",
      minLength: 0,
      maxLength: 48,
    },
    {
      path: "capacity",
      label: {
        id: "motionAtlas.shelter-usable-area-capacity.controls.copy.capacity",
        message: "capacity",
      },
      kind: "text",
      minLength: 0,
      maxLength: 48,
    },
    {
      path: "demand",
      label: {
        id: "motionAtlas.shelter-usable-area-capacity.controls.copy.demand",
        message: "demand",
      },
      kind: "text",
      minLength: 0,
      maxLength: 48,
    },
    {
      path: "shortfall",
      label: {
        id: "motionAtlas.shelter-usable-area-capacity.controls.copy.shortfall",
        message: "shortfall",
      },
      kind: "text",
      minLength: 0,
      maxLength: 48,
    },
    {
      path: "spare",
      label: {
        id: "motionAtlas.shelter-usable-area-capacity.controls.copy.spare",
        message: "spare",
      },
      kind: "text",
      minLength: 0,
      maxLength: 48,
    },
    {
      path: "areaUnit",
      label: {
        id: "motionAtlas.shelter-usable-area-capacity.controls.copy.areaUnit",
        message: "areaUnit",
      },
      kind: "text",
      minLength: 0,
      maxLength: 48,
    },
  ],
  help: {
    id: "motionAtlas.shelter-usable-area-capacity.controls.copy.help",
    message:
      "All use labels, assumption labels and quantity units. All fields required; each <= 48 characters; context must distinguish an illustration from a safety or shelter standard.",
  },
};

import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for copy. */
export const COPY_CONTROL: StockControl = {
  path: "copy",
  label: {
    id: "motionAtlas.catchment-union-gaps.controls.copy",
    message: "copy",
  },
  kind: "object",
  controls: [
    {
      path: "context",
      label: {
        id: "motionAtlas.catchment-union-gaps.controls.copy.context",
        message: "context",
      },
      kind: "text",
      minLength: 0,
      maxLength: 40,
    },
    {
      path: "covered",
      label: {
        id: "motionAtlas.catchment-union-gaps.controls.copy.covered",
        message: "covered",
      },
      kind: "text",
      minLength: 0,
      maxLength: 40,
    },
    {
      path: "uncovered",
      label: {
        id: "motionAtlas.catchment-union-gaps.controls.copy.uncovered",
        message: "uncovered",
      },
      kind: "text",
      minLength: 0,
      maxLength: 40,
    },
    {
      path: "overlap",
      label: {
        id: "motionAtlas.catchment-union-gaps.controls.copy.overlap",
        message: "overlap",
      },
      kind: "text",
      minLength: 0,
      maxLength: 40,
    },
    {
      path: "total",
      label: {
        id: "motionAtlas.catchment-union-gaps.controls.copy.total",
        message: "total",
      },
      kind: "text",
      minLength: 0,
      maxLength: 40,
    },
    {
      path: "households",
      label: {
        id: "motionAtlas.catchment-union-gaps.controls.copy.households",
        message: "households",
      },
      kind: "text",
      minLength: 0,
      maxLength: 40,
    },
    {
      path: "members",
      label: {
        id: "motionAtlas.catchment-union-gaps.controls.copy.members",
        message: "members",
      },
      kind: "text",
      minLength: 0,
      maxLength: 40,
    },
  ],
  help: {
    id: "motionAtlas.catchment-union-gaps.controls.copy.help",
    message:
      "Visible labels and unit names. All fields required; each <= 40 characters; context must identify fictional schematic geography.",
  },
};

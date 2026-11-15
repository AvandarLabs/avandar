import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for copy. */
export const COPY_CONTROL: StockControl = {
  path: "copy",
  label: {
    id: "motionAtlas.surveillance-reporting-backfill.controls.copy",
    message: "copy",
  },
  kind: "object",
  controls: [
    {
      path: "context",
      label: {
        id: "motionAtlas.surveillance-reporting-backfill.controls.copy.context",
        message: "context",
      },
      kind: "text",
      minLength: 0,
      maxLength: 40,
    },
    {
      path: "axis",
      label: {
        id: "motionAtlas.surveillance-reporting-backfill.controls.copy.axis",
        message: "axis",
      },
      kind: "text",
      minLength: 0,
      maxLength: 40,
    },
    {
      path: "unit",
      label: {
        id: "motionAtlas.surveillance-reporting-backfill.controls.copy.unit",
        message: "unit",
      },
      kind: "text",
      minLength: 0,
      maxLength: 40,
    },
    {
      path: "earlier",
      label: {
        id: "motionAtlas.surveillance-reporting-backfill.controls.copy.earlier",
        message: "earlier",
      },
      kind: "text",
      minLength: 0,
      maxLength: 40,
    },
    {
      path: "revised",
      label: {
        id: "motionAtlas.surveillance-reporting-backfill.controls.copy.revised",
        message: "revised",
      },
      kind: "text",
      minLength: 0,
      maxLength: 40,
    },
    {
      path: "newReports",
      label: {
        id: "motionAtlas.surveillance-reporting-backfill.controls.copy.newReports",
        message: "newReports",
      },
      kind: "text",
      minLength: 0,
      maxLength: 40,
    },
  ],
  help: {
    id: "motionAtlas.surveillance-reporting-backfill.controls.copy.help",
    message:
      "Visible measure, snapshot and arrival labels. All fields required; each <= 40 characters; context must identify fictional data.",
  },
};

import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for copy. */
export const COPY_CONTROL: StockControl = {
  path: "copy",
  label: {
    id: "motionAtlas.stratified-spatial-sample.controls.copy",
    message: "copy",
  },
  kind: "object",
  controls: [
    {
      path: "context",
      label: {
        id: "motionAtlas.stratified-spatial-sample.controls.copy.context",
        message: "context",
      },
      kind: "text",
      minLength: 0,
      maxLength: 40,
    },
    {
      path: "selected",
      label: {
        id: "motionAtlas.stratified-spatial-sample.controls.copy.selected",
        message: "selected",
      },
      kind: "text",
      minLength: 0,
      maxLength: 40,
    },
    {
      path: "eligible",
      label: {
        id: "motionAtlas.stratified-spatial-sample.controls.copy.eligible",
        message: "eligible",
      },
      kind: "text",
      minLength: 0,
      maxLength: 40,
    },
    {
      path: "unsampled",
      label: {
        id: "motionAtlas.stratified-spatial-sample.controls.copy.unsampled",
        message: "unsampled",
      },
      kind: "text",
      minLength: 0,
      maxLength: 40,
    },
    {
      path: "unit",
      label: {
        id: "motionAtlas.stratified-spatial-sample.controls.copy.unit",
        message: "unit",
      },
      kind: "text",
      minLength: 0,
      maxLength: 40,
    },
  ],
  help: {
    id: "motionAtlas.stratified-spatial-sample.controls.copy.help",
    message:
      "Visible qualifier, selection labels and counting unit. All fields required; each <= 40 characters; context must identify a fictional schematic plan.",
  },
};

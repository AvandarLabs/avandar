import type { StockControl } from "../../contracts/StockContract.types";
/** Serializable editor for sites. */
export const SITES_CONTROL: StockControl = {
  path: "sites",
  label: {
    id: "motionAtlas.stratified-spatial-sample.controls.sites",
    message: "sites",
  },
  kind: "collection",
  minItems: 4,
  maxItems: 12,
  itemSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        maxLength: 12,
      },
      label: {
        type: "string",
        maxLength: 20,
      },
      stratumId: {
        type: "string",
        maxLength: 12,
      },
      x: {
        type: "number",
        minimum: 0,
        maximum: 100,
      },
      y: {
        type: "number",
        minimum: 0,
        maximum: 100,
      },
    },
    required: ["id", "label", "stratumId", "x", "y"],
    additionalProperties: false,
  },
  itemControls: [
    {
      path: "id",
      label: {
        id: "motionAtlas.stratified-spatial-sample.controls.sites.id",
        message: "id",
      },
      kind: "text",
      minLength: 0,
      maxLength: 12,
    },
    {
      path: "label",
      label: {
        id: "motionAtlas.stratified-spatial-sample.controls.sites.label",
        message: "label",
      },
      kind: "text",
      minLength: 0,
      maxLength: 20,
    },
    {
      path: "stratumId",
      label: {
        id: "motionAtlas.stratified-spatial-sample.controls.sites.stratumId",
        message: "stratumId",
      },
      kind: "select",
      optionsFrom: {
        path: "strata",
        valueKey: "id",
        labelKey: "label",
      },
    },
    {
      path: "x",
      label: {
        id: "motionAtlas.stratified-spatial-sample.controls.sites.x",
        message: "x",
      },
      kind: "number",
      min: 0,
      max: 100,
    },
    {
      path: "y",
      label: {
        id: "motionAtlas.stratified-spatial-sample.controls.sites.y",
        message: "y",
      },
      kind: "number",
      min: 0,
      max: 100,
    },
  ],
  help: {
    id: "motionAtlas.stratified-spatial-sample.controls.sites.help",
    message:
      "The complete illustrated eligible-site frame. 4..12 unique sites; IDs <= 12 characters; labels <= 20 characters; stratumId must exist; coordinates strictly inside that stratum; every stratum has at least one site.",
  },
};

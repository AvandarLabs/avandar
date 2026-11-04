import { propEq } from "@avandar/utils";
import { makeStockControlsFromSchema } from "../../contracts/makeStockControlsFromSchema/makeStockControlsFromSchema";
import { jsonSchema } from "./StatePreservingSourceRefresh.schema";
import type { StockControl } from "../../contracts/StockContract.types";

const COMPATIBLE_PATHS: string[] = [
  "records",
  "sourceRows",
  "labels",
  "showWriteCount",
  "copy",
];
const compatible: StockControl[] = makeStockControlsFromSchema({
  schema: {
    type: "object",
    additionalProperties: false,
    required: COMPATIBLE_PATHS,
    properties: Object.fromEntries(
      COMPATIBLE_PATHS.map((path) => [path, jsonSchema.properties![path]]),
    ),
  },
  messageNamespace: "motionAtlas.state-preserving-source-refresh",
  referenceSelects: {
    "sourceRows.id": {
      path: "records",
      valueKey: "id",
      labelKey: "label",
      scope: "root",
    },
  },
});
const EXPLICIT: StockControl[] = [];
/** Accepted converter shapes plus explicit primitive and numeric editors. */
export const controls: StockControl[] = [
  "records",
  "sourceRows",
  "labels",
  "showWriteCount",
  "copy",
].map((path) => {
  const control = [...compatible, ...EXPLICIT].find(propEq("path", path));
  if (!control) {
    throw new Error(`Missing stock control ${path}.`);
  }
  return control;
});

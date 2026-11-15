import { z } from "zod";
import { makeStockControlsFromSchema } from "../../contracts/makeStockControlsFromSchema/makeStockControlsFromSchema";
import { inputSchema } from "./PdfNearestLabelReview.schema";
import type { StockControl } from "../../contracts/StockContract.types";

const NAMESPACE = "motionAtlas.pdf-nearest-label-review" as const;
/** Ratio is a proximity heuristic, never a probability. */
export const ratioMessage: { id: string; message: string } = {
  id: `${NAMESPACE}.controls.ambiguityThreshold`,
  message: "Distance ratio, not probability",
};
/** Uncertainty remains visible when numeric distances are hidden. */
export const ambiguityMessage: { id: string; message: string } = {
  id: `${NAMESPACE}.controls.ambiguityThreshold.help`,
  message: "Ambiguous association",
};
/** Human review remains explicit rather than accepting a suggestion. */
export const unresolvedMessage: { id: string; message: string } = {
  id: `${NAMESPACE}.controls.reviewedLabelId.help`,
  message: "Unresolved review",
};
const supported: StockControl[] = makeStockControlsFromSchema({
  schema: z.toJSONSchema(
    z
      .strictObject(inputSchema.shape)
      .pick({ showDistanceValues: true, copy: true }),
  ),
  messageNamespace: NAMESPACE,
});
function _positionControls(prefix: string): StockControl[] {
  return ["x", "y"].map((path) => ({
    path,
    kind: "number",
    min: 5,
    max: 95,
    label: { id: `${NAMESPACE}.controls.${prefix}.${path}`, message: path },
  }));
}
/**
 * Explicit spatial and nullable reference editors plus shared text controls.
 */
export const controls: StockControl[] = [
  {
    path: "figure",
    kind: "object",
    label: { id: `${NAMESPACE}.controls.figure`, message: "Printed figure" },
    controls: [
      ...makeStockControlsFromSchema({
        schema: z.toJSONSchema(inputSchema.shape.figure.pick({ text: true })),
        messageNamespace: `${NAMESPACE}.figure`,
      }),
      ..._positionControls("figure"),
    ],
  },
  {
    path: "labels",
    kind: "collection",
    minItems: 2,
    maxItems: 2,
    itemSchema: z.toJSONSchema(inputSchema.shape.labels.element),
    label: { id: `${NAMESPACE}.controls.labels`, message: "Candidate labels" },
    itemControls: [
      ...makeStockControlsFromSchema({
        schema: z.toJSONSchema(
          inputSchema.shape.labels.element.pick({ id: true, text: true }),
        ),
        messageNamespace: `${NAMESPACE}.labels`,
      }),
      ..._positionControls("labels"),
    ],
  },
  {
    path: "ambiguityThreshold",
    kind: "number",
    min: 0.5,
    max: 1,
    label: ratioMessage,
    help: ambiguityMessage,
  },
  {
    path: "reviewedLabelId",
    kind: "select",
    nullable: true,
    optionsFrom: { path: "labels", valueKey: "id", labelKey: "text" },
    label: {
      id: `${NAMESPACE}.controls.reviewedLabelId`,
      message: "Reviewed choice",
    },
    help: unresolvedMessage,
  },
  ...supported,
];

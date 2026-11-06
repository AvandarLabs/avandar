import { z } from "zod";
import { makeStockControlsFromSchema } from "../../contracts/makeStockControlsFromSchema/makeStockControlsFromSchema";
import { inputSchema } from "./PdfGridReconstruction.schema";
import type { StockControl } from "../../contracts/StockContract.types";

const NAMESPACE = "motionAtlas.pdf-grid-reconstruction" as const;
/** The selected whitespace signal always retains its inference qualifier. */
export const inferredLayoutMessage: { id: string; message: string } = {
  id: `${NAMESPACE}.controls.signal.whitespace`,
  message: "Inferred layout",
};
const supported: StockControl[] = makeStockControlsFromSchema({
  schema: z.toJSONSchema(
    z.strictObject(inputSchema.shape).omit({ grid: true }),
  ),
  messageNamespace: NAMESPACE,
}).map((control) =>
  control.kind === "select" && "options" in control
    ? {
        ...control,
        options: control.options.map((option) =>
          option.value === "whitespace"
            ? { ...option, label: inferredLayoutMessage }
            : option,
        ),
      }
    : control,
);
/**
 * Explicit nested primitive collections preserve every coordinate occurrence.
 */
export const controls: StockControl[] = [
  {
    path: "grid",
    kind: "object",
    label: { id: `${NAMESPACE}.controls.grid`, message: "Grid" },
    controls: [
      {
        path: "columnLabels",
        kind: "collection",
        minItems: 2,
        maxItems: 4,
        itemSchema: z.toJSONSchema(
          inputSchema.shape.grid.shape.columnLabels.element,
        ),
        label: {
          id: `${NAMESPACE}.controls.grid.columnLabels`,
          message: "Column headings",
        },
        itemControls: [
          {
            path: "",
            kind: "text",
            minLength: 1,
            maxLength: 16,
            label: {
              id: `${NAMESPACE}.controls.grid.columnLabels.item`,
              message: "Heading",
            },
          },
        ],
      },
      {
        path: "rows",
        kind: "collection",
        minItems: 2,
        maxItems: 4,
        itemSchema: z.toJSONSchema(inputSchema.shape.grid.shape.rows.element),
        label: { id: `${NAMESPACE}.controls.grid.rows`, message: "Data rows" },
        itemControls: [
          {
            path: "",
            kind: "collection",
            minItems: 2,
            maxItems: 4,
            itemSchema: z.toJSONSchema(
              inputSchema.shape.grid.shape.rows.element.element,
            ),
            label: {
              id: `${NAMESPACE}.controls.grid.rows.cells`,
              message: "Cells",
            },
            itemControls: [
              {
                path: "",
                kind: "text",
                minLength: 0,
                maxLength: 18,
                multiline: true,
                label: {
                  id: `${NAMESPACE}.controls.grid.rows.cell`,
                  message: "Literal cell",
                },
              },
            ],
          },
        ],
      },
    ],
  },
  ...supported,
];

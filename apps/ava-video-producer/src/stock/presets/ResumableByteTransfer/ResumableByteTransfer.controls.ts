import { z } from "zod";
import { makeStockControlsFromSchema } from "../../contracts/makeStockControlsFromSchema/makeStockControlsFromSchema";
import { inputSchema } from "./ResumableByteTransfer.schema";
import type { StockControl } from "../../contracts/StockContract.types";

const NAMESPACE = "motionAtlas.resumable-byte-transfer" as const;
const supported: StockControl[] = makeStockControlsFromSchema({
  schema: z.toJSONSchema(
    z
      .strictObject(inputSchema.shape)
      .omit({ file: true, acknowledgedBytes: true }),
  ),
  messageNamespace: NAMESPACE,
});
/** Serializable editors include explicit integer byte controls. */
export const controls: StockControl[] = [
  {
    path: "file",
    kind: "object",
    label: { id: `${NAMESPACE}.controls.file`, message: "File" },
    controls: [
      ...makeStockControlsFromSchema({
        schema: z.toJSONSchema(inputSchema.shape.file.pick({ label: true })),
        messageNamespace: `${NAMESPACE}.file`,
      }),
      {
        path: "sizeBytes",
        kind: "number",
        min: 2,
        max: 100000,
        step: 1,
        label: {
          id: `${NAMESPACE}.controls.file.sizeBytes`,
          message: "File bytes",
        },
      },
      {
        path: "chunkBytes",
        kind: "number",
        min: 1,
        max: 100000,
        step: 1,
        label: {
          id: `${NAMESPACE}.controls.file.chunkBytes`,
          message: "Chunk bytes",
        },
      },
    ],
  },
  {
    path: "acknowledgedBytes",
    kind: "number",
    min: 0,
    max: 99999,
    step: 1,
    label: {
      id: `${NAMESPACE}.controls.acknowledgedBytes`,
      message: "Acknowledged offset",
    },
  },
  ...supported,
];

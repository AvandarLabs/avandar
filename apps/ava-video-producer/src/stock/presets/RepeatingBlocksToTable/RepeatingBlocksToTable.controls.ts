import { z } from "zod";
import { makeStockControlsFromSchema } from "../../contracts/makeStockControlsFromSchema/makeStockControlsFromSchema";
import { inputSchema } from "./RepeatingBlocksToTable.schema";
import type {
  StockControl,
  StockMessageDescriptor,
} from "../../contracts/StockContract.types";

function _message({
  key,
  message,
}: {
  key: string;
  message: string;
}): StockMessageDescriptor {
  return { id: `motionAtlas.repeating-blocks-to-table.${key}`, message };
}
/** Inputs for text. */
type TextOptions = {
  path: string;
  minLength: number;
  maxLength: number;
  prefix?: string;
};

function _text({
  path,
  minLength,
  maxLength,
  prefix = path,
}: TextOptions): StockControl {
  return {
    path,
    kind: "text",
    minLength,
    maxLength,
    label: _message({ key: `controls.${prefix}`, message: path }),
  };
}
/** Inputs for reference. */
type ReferenceOptions = {
  path: string;
  source: string;
  valueKey: string;
  labelKey: string;
  prefix?: string;
};

function _reference({
  path,
  source,
  valueKey,
  labelKey,
  prefix = path,
}: ReferenceOptions): StockControl {
  return {
    path,
    kind: "select",
    optionsFrom: { path: source, valueKey, labelKey },
    label: _message({ key: `controls.${prefix}`, message: path }),
  };
}

const supported: StockControl[] = makeStockControlsFromSchema({
  schema: z.toJSONSchema(
    z.strictObject({
      fields: inputSchema.shape.fields,
      missingLabel: inputSchema.shape.missingLabel,
      showBlockNumbers: inputSchema.shape.showBlockNumbers,
      copy: inputSchema.shape.copy,
    }),
  ),
  messageNamespace: "motionAtlas.repeating-blocks-to-table",
});
/** Recursive controls retain nullable keyed cells and empty accepted IDs. */
export const controls: StockControl[] = [
  supported[0],
  {
    path: "blocks",
    kind: "collection",
    label: _message({ key: "controls.blocks", message: "Blocks" }),
    minItems: 2,
    maxItems: 3,
    itemSchema: z.toJSONSchema(inputSchema.shape.blocks.element),
    itemControls: [
      _text({ path: "id", minLength: 0, maxLength: 12, prefix: "blocks.id" }),
      _text({
        path: "heading",
        minLength: 1,
        maxLength: 20,
        prefix: "blocks.heading",
      }),
      {
        path: "cells",
        kind: "collection",
        label: _message({ key: "controls.blocks.cells", message: "Cells" }),
        minItems: 2,
        maxItems: 3,
        itemSchema: z.toJSONSchema(
          inputSchema.shape.blocks.element.shape.cells.element,
        ),
        itemControls: [
          _reference({
            path: "fieldId",
            source: "fields",
            valueKey: "id",
            labelKey: "label",
            prefix: "blocks.cells.fieldId",
          }),
          {
            ..._text({
              path: "text",
              minLength: 1,
              maxLength: 26,
              prefix: "blocks.cells.text",
            }),
            nullable: true,
          },
        ],
      },
    ],
  },
  ...supported.slice(1),
];

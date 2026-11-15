import { z } from "zod";
import { makeStockControlsFromSchema } from "../../contracts/makeStockControlsFromSchema/makeStockControlsFromSchema";
import { inputSchema } from "./PublicationSnapshotSlice.schema";
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
  return { id: `motionAtlas.publication-snapshot-slice.${key}`, message };
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

/** Explicit publication audience labels are not inferred access control. */
export const audienceMessages: {
  internal: StockMessageDescriptor;
  public: StockMessageDescriptor;
} = {
  internal: _message({ key: "audience.internal", message: "Internal" }),
  public: _message({ key: "audience.public", message: "Public" }),
};
const supported: StockControl[] = makeStockControlsFromSchema({
  schema: z.toJSONSchema(
    z.strictObject({
      publication: inputSchema.shape.publication,
      showExcludedCells: inputSchema.shape.showExcludedCells,
      copy: inputSchema.shape.copy,
    }),
  ),
  messageNamespace: "motionAtlas.publication-snapshot-slice",
});
const publication: StockControl = {
  path: "publication",
  kind: "object",
  label: _message({ key: "controls.publication", message: "Publication" }),
  controls: [
    _text({
      path: "revision",
      minLength: 1,
      maxLength: 24,
      prefix: "publication.revision",
    }),
    {
      path: "audience",
      kind: "select",
      label: _message({
        key: "controls.publication.audience",
        message: "Audience",
      }),
      options: Object.entries(audienceMessages).map(([value, label]) => ({
        value,
        label,
      })),
    },
    _text({
      path: "label",
      minLength: 1,
      maxLength: 24,
      prefix: "publication.label",
    }),
  ],
};
/**
 * Primitive row, selection and cell collections retain exact IDs and empty
 * values.
 */
export const controls: StockControl[] = [
  {
    path: "table",
    kind: "object",
    label: _message({ key: "controls.table", message: "Table" }),
    controls: [
      {
        path: "columns",
        kind: "collection",
        label: _message({ key: "controls.table.columns", message: "Columns" }),
        minItems: 2,
        maxItems: 4,
        itemSchema: z.toJSONSchema(
          inputSchema.shape.table.shape.columns.element,
        ),
        itemControls: [
          _text({
            path: "id",
            minLength: 0,
            maxLength: 18,
            prefix: "table.columns.id",
          }),
          _text({
            path: "label",
            minLength: 0,
            maxLength: 18,
            prefix: "table.columns.label",
          }),
        ],
      },
      {
        path: "rows",
        kind: "collection",
        label: _message({ key: "controls.table.rows", message: "Rows" }),
        minItems: 2,
        maxItems: 4,
        itemSchema: z.toJSONSchema(inputSchema.shape.table.shape.rows.element),
        itemControls: [
          _text({
            path: "id",
            minLength: 0,
            maxLength: 18,
            prefix: "table.rows.id",
          }),
          {
            path: "cells",
            kind: "collection",
            label: _message({
              key: "controls.table.rows.cells",
              message: "Cells",
            }),
            minItems: 2,
            maxItems: 4,
            itemSchema: z.toJSONSchema(z.string().max(18)),
            itemControls: [
              {
                ..._text({
                  path: "",
                  minLength: 0,
                  maxLength: 18,
                  prefix: "table.rows.cells.value",
                }),
                label: _message({
                  key: "controls.table.rows.cells.value",
                  message: "Cell value",
                }),
              },
            ],
          },
        ],
      },
    ],
  },
  {
    path: "selection",
    kind: "object",
    label: _message({ key: "controls.selection", message: "Selection" }),
    controls: [
      {
        path: "rowIds",
        kind: "collection",
        label: _message({
          key: "controls.selection.rowIds",
          message: "Selected rows",
        }),
        minItems: 1,
        maxItems: 4,
        itemSchema: z.toJSONSchema(z.string().max(18)),
        itemControls: [
          {
            ..._reference({
              path: "",
              source: "table.rows",
              valueKey: "id",
              labelKey: "id",
              prefix: "selection.rowIds.value",
            }),
            label: _message({
              key: "controls.selection.rowIds.value",
              message: "Selected row",
            }),
          },
        ],
      },
      {
        path: "columnIds",
        kind: "collection",
        label: _message({
          key: "controls.selection.columnIds",
          message: "Selected columns",
        }),
        minItems: 1,
        maxItems: 4,
        itemSchema: z.toJSONSchema(z.string().max(18)),
        itemControls: [
          {
            ..._reference({
              path: "",
              source: "table.columns",
              valueKey: "id",
              labelKey: "label",
              prefix: "selection.columnIds.value",
            }),
            label: _message({
              key: "controls.selection.columnIds.value",
              message: "Selected column",
            }),
          },
        ],
      },
    ],
  },
  {
    path: "liveEdit",
    kind: "object",
    label: _message({ key: "controls.liveEdit", message: "Later live edit" }),
    controls: [
      _reference({
        path: "rowId",
        source: "table.rows",
        valueKey: "id",
        labelKey: "id",
        prefix: "liveEdit.rowId",
      }),
      _reference({
        path: "columnId",
        source: "table.columns",
        valueKey: "id",
        labelKey: "label",
        prefix: "liveEdit.columnId",
      }),
      _text({
        path: "value",
        minLength: 0,
        maxLength: 18,
        prefix: "liveEdit.value",
      }),
    ],
  },
  publication,
  ...supported.slice(1),
];

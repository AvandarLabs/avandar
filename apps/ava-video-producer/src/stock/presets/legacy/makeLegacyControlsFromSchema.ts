import type {
  StockControl,
  StockJsonSchema,
} from "../../contracts/StockContract.types";

type ControlCopy = Pick<StockControl, "path" | "label">;

function _createControl({
  id,
  path,
  schema,
}: {
  id: string;
  path: string;
  schema: Readonly<StockJsonSchema>;
}): StockControl {
  const copy = _createControlCopy({ id, path });
  if (schema.type === "boolean") {
    return { ...copy, kind: "boolean" };
  }
  if (schema.type === "number" || schema.type === "integer") {
    return {
      ...copy,
      kind: "number",
      min: schema.minimum ?? 0,
      max: schema.maximum ?? 179,
      step: schema.type === "integer" ? 1 : undefined,
    };
  }
  if (schema.type === "object") {
    return {
      ...copy,
      kind: "object",
      controls: makeLegacyControlsFromSchema({ id, schema }),
    };
  }
  if (schema.prefixItems) {
    return {
      ...copy,
      kind: "object",
      controls: _createTupleControls({ id, path, items: schema.prefixItems }),
    };
  }
  if (schema.type === "array") {
    return _createCollectionControl({ id, copy, schema });
  }
  return {
    ...copy,
    kind: "text",
    minLength: schema.minLength ?? 0,
    maxLength: schema.maxLength ?? 20,
  };
}

/** Builds data-only editors from each bounded legacy structural schema. */
export function makeLegacyControlsFromSchema({
  id,
  schema,
}: Readonly<{
  id: string;
  schema: Readonly<StockJsonSchema>;
}>): StockControl[] {
  return Object.entries(schema.properties ?? {}).map(([path, definition]) => {
    if (typeof definition !== "object" || !definition) {
      throw new Error(`Unsupported control schema: ${id}.${path}`);
    }
    return _createControl({ id, path, schema: definition });
  });
}

function _createTupleControls({
  id,
  path,
  items,
}: {
  id: string;
  path: string;
  items: NonNullable<StockJsonSchema["prefixItems"]>;
}): StockControl[] {
  return items.map((item, index) => {
    if (typeof item !== "object") {
      throw new Error(`Unsupported tuple item: ${id}.${path}.${index}`);
    }
    return _createControl({ id, path: String(index), schema: item });
  });
}

function _createCollectionControl({
  id,
  copy,
  schema,
}: {
  id: string;
  copy: Readonly<ControlCopy>;
  schema: Readonly<StockJsonSchema>;
}): StockControl {
  const itemSchema = schema.items;
  if (
    !itemSchema ||
    typeof itemSchema !== "object" ||
    Array.isArray(itemSchema)
  ) {
    throw new Error(`Unsupported collection schema: ${id}.${copy.path}`);
  }
  return {
    ...copy,
    kind: "collection",
    minItems: schema.minItems ?? 0,
    maxItems: schema.maxItems ?? 10,
    itemSchema,
    itemControls:
      itemSchema.type === "object"
        ? makeLegacyControlsFromSchema({
            id: `${id}.${copy.path}`,
            schema: itemSchema,
          })
        : [
            _createControl({
              id: `${id}.${copy.path}`,
              path: "",
              schema: itemSchema,
            }),
          ],
  };
}

function _createControlCopy({
  id,
  path,
}: {
  id: string;
  path: string;
}): ControlCopy {
  return {
    path,
    label: {
      id: `motionAtlas.${id}.controls.${path || "item"}`,
      message:
        path
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (letter) => letter.toUpperCase()) || "Value",
    },
  };
}

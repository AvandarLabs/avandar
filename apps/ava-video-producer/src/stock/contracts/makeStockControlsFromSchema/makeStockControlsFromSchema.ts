import type { StockControl, StockJsonSchema } from "../StockContract.types";
type ReferenceSelect = Extract<
  StockControl,
  { optionsFrom: object }
>["optionsFrom"];
type SchemaNode = StockJsonSchema | boolean;
type Field = {
  path: string;
  prefix: string;
  node: SchemaNode;
  messageNamespace: string;
  referenceSelects: Readonly<Record<string, ReferenceSelect>>;
};
type ObjectField = Omit<Field, "node"> & { node: StockJsonSchema };
function _fail(path: string): never {
  throw new Error(`Unsupported stock controls schema at ${path || "root"}.`);
}
function _getNode({
  node,
  path,
}: {
  node: SchemaNode;
  path: string;
}): StockJsonSchema {
  if (!node || typeof node !== "object" || Array.isArray(node)) {
    _fail(path);
  }
  return node;
}
function _assertKeys({
  node,
  keys,
  path,
}: {
  node: StockJsonSchema;
  keys: readonly string[];
  path: string;
}): void {
  if (
    !node ||
    typeof node !== "object" ||
    Array.isArray(node) ||
    Object.keys(node).some((key) => !keys.includes(key))
  ) {
    _fail(path);
  }
}
function _getMaximumFromBounds({
  minimum,
  maximum,
  path,
}: {
  minimum: number;
  maximum: number | undefined;
  path: string;
}): number {
  if (
    !Number.isSafeInteger(minimum) ||
    minimum < 0 ||
    !Number.isSafeInteger(maximum) ||
    maximum === undefined ||
    maximum < minimum
  ) {
    _fail(path);
  }
  return maximum;
}
function _validateObject({
  schemaNode,
  prefix,
}: {
  schemaNode: SchemaNode;
  prefix: string;
}): Record<string, SchemaNode> {
  const node = _getNode({ node: schemaNode, path: prefix });
  _assertKeys({
    node,
    keys: ["$schema", "type", "properties", "required", "additionalProperties"],
    path: prefix,
  });
  const properties = node.properties;
  if (
    node.type !== "object" ||
    node.additionalProperties !== false ||
    !properties ||
    typeof properties !== "object" ||
    Array.isArray(properties)
  ) {
    _fail(prefix);
  }
  const keys = Object.keys(properties);
  if (
    keys.some((key) => !key.length || key.includes(".")) ||
    keys.length !== (node.required?.length ?? 0) ||
    keys.some((key) => !node.required?.includes(key))
  ) {
    _fail(prefix);
  }
  return properties;
}
function _createEnum({
  node,
  prefix,
  path,
  messageNamespace,
}: Readonly<ObjectField>): StockControl {
  _assertKeys({ node, keys: ["$schema", "type", "enum"], path: prefix });
  const values = node.enum;
  if (
    node.type !== "string" ||
    !values?.length ||
    values.some((value) => typeof value !== "string") ||
    new Set(values).size !== values.length
  ) {
    _fail(prefix);
  }
  return {
    path,
    label: { id: `${messageNamespace}.controls.${prefix}`, message: path },
    kind: "select",
    options: values.map((value) => ({
      value: String(value),
      label: {
        id: `${messageNamespace}.controls.${prefix}.${value}`,
        message: String(value),
      },
    })),
  };
}
function _createText({
  node,
  path,
  prefix,
  messageNamespace,
  referenceSelects,
}: Readonly<ObjectField>): StockControl {
  _assertKeys({
    node,
    keys: ["$schema", "type", "minLength", "maxLength"],
    path: prefix,
  });
  const minimum = node.minLength ?? 0;
  const maximum = _getMaximumFromBounds({
    minimum,
    maximum: node.maxLength,
    path: prefix,
  });
  const label = { id: `${messageNamespace}.controls.${prefix}`, message: path };
  return Object.hasOwn(referenceSelects, prefix)
    ? {
        path,
        label,
        kind: "select",
        optionsFrom: { ...referenceSelects[prefix] },
      }
    : { path, label, kind: "text", minLength: minimum, maxLength: maximum };
}
function _createCollection(field: Readonly<ObjectField>): StockControl {
  const { node, prefix, path, messageNamespace, referenceSelects } = field;
  _assertKeys({
    node,
    keys: ["$schema", "type", "minItems", "maxItems", "items"],
    path: prefix,
  });
  if (node.minItems === undefined || !node.items || Array.isArray(node.items)) {
    _fail(prefix);
  }
  const maximum = _getMaximumFromBounds({
    minimum: node.minItems,
    maximum: node.maxItems,
    path: prefix,
  });
  const items = _getNode({ node: node.items, path: prefix });
  const properties = _validateObject({ schemaNode: items, prefix });
  return {
    path,
    label: { id: `${messageNamespace}.controls.${prefix}`, message: path },
    kind: "collection",
    minItems: node.minItems,
    maxItems: maximum,
    itemSchema: items,
    itemControls: Object.entries(properties).map(([key, child]) =>
      _createField({
        path: key,
        prefix: `${prefix}.${key}`,
        node: child,
        messageNamespace,
        referenceSelects,
      }),
    ),
  };
}
function _createField(field: Readonly<Field>): StockControl {
  const { prefix, path, messageNamespace, referenceSelects } = field;
  const node = _getNode({ node: field.node, path: prefix });
  const configured = { ...field, node };
  if (
    Object.hasOwn(referenceSelects, prefix) &&
    (node.type !== "string" || node.enum)
  ) {
    _fail(prefix);
  }
  if (node.enum) {
    return _createEnum(configured);
  }
  if (node.type === "string") {
    return _createText(configured);
  }
  const label = { id: `${messageNamespace}.controls.${prefix}`, message: path };
  if (node.type === "boolean") {
    _assertKeys({ node, keys: ["$schema", "type"], path: prefix });
    return { path, label, kind: "boolean" };
  }
  if (node.type === "array") {
    return _createCollection(configured);
  }
  const properties = _validateObject({ schemaNode: node, prefix });
  return {
    path,
    label,
    kind: "object",
    controls: Object.entries(properties).map(([key, child]) =>
      _createField({
        path: key,
        prefix: `${prefix}.${key}`,
        node: child,
        messageNamespace,
        referenceSelects,
      }),
    ),
  };
}
function _getControlPaths({
  controls,
  prefix = "",
}: {
  controls: readonly StockControl[];
  prefix?: string;
}): string[] {
  return controls.flatMap((control) => {
    const path = prefix ? `${prefix}.${control.path}` : control.path;
    const children =
      control.kind === "object"
        ? control.controls
        : control.kind === "collection"
          ? control.itemControls
          : [];
    return [path, ..._getControlPaths({ controls: children, prefix: path })];
  });
}
/**
 * Converts strict bounded text, objects, object collections, string enums and
 * booleans into serializable controls. Unsupported constraints fail explicitly.
 */
export function makeStockControlsFromSchema({
  schema,
  messageNamespace,
  referenceSelects = {},
}: Readonly<{
  schema: StockJsonSchema;
  messageNamespace: string;
  referenceSelects?: Readonly<Record<string, ReferenceSelect>>;
}>): StockControl[] {
  const properties = _validateObject({ schemaNode: schema, prefix: "" });
  const controls = Object.entries(properties).map(([path, node]) =>
    _createField({
      path,
      prefix: path,
      node,
      messageNamespace,
      referenceSelects,
    }),
  );
  const paths = _getControlPaths({ controls });
  if (Object.keys(referenceSelects).some((path) => !paths.includes(path))) {
    _fail("referenceSelects");
  }
  return controls;
}

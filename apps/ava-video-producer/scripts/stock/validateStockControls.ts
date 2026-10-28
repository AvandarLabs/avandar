import { match, P } from "ts-pattern";
import type {
  StockControl,
  StockJsonSchema,
} from "../../src/stock/contracts/StockContract.types";
type Context = {
  root: StockJsonSchema[];
  current: StockJsonSchema[];
  item: StockJsonSchema[];
  location: string;
};

function _branches(
  nodes: ReadonlyArray<StockJsonSchema | boolean>,
): StockJsonSchema[] {
  return nodes.flatMap((node) => {
    if (typeof node === "boolean") {
      return [];
    }
    if (node.$ref || node.allOf) {
      throw new Error(
        "Unsupported referenced or intersected stock control schema",
      );
    }
    return node.anyOf || node.oneOf
      ? _branches(node.anyOf ?? node.oneOf ?? [])
      : [node];
  });
}
function _items(nodes: readonly StockJsonSchema[]): StockJsonSchema[] {
  return _branches(
    nodes.flatMap((node) => {
      if (node.type !== "array") {
        return [];
      }
      const tail = Array.isArray(node.items)
        ? node.items
        : node.items === undefined
          ? []
          : [node.items];
      return [...(node.prefixItems ?? []), ...tail];
    }),
  );
}
function _getPath({
  nodes,
  path,
}: {
  nodes: readonly StockJsonSchema[];
  path: string;
}): StockJsonSchema[] {
  return (path ? path.split(".") : []).reduce(
    (parents, segment) =>
      _branches(
        parents.flatMap((node) => {
          const property = node.properties?.[segment];
          if (property !== undefined) {
            return [property];
          }
          if (node.type === "array" && /^(0|[1-9][0-9]*)$/.test(segment)) {
            const child = node.prefixItems?.[Number(segment)] ?? node.items;
            return child === undefined
              ? []
              : Array.isArray(child)
                ? child
                : [child];
          }
          return [];
        }),
      ),
    _branches(nodes),
  );
}
function _requirePath({
  nodes,
  path,
  location,
}: {
  nodes: readonly StockJsonSchema[];
  path: string;
  location: string;
}): StockJsonSchema[] {
  const found = _getPath({ nodes, path });
  if (!found.length) {
    throw new Error(`Stock control path does not exist: ${location}.${path}`);
  }
  return found;
}
function _hasType({
  node,
  type,
}: {
  node: Readonly<StockJsonSchema>;
  type: "string" | "number" | "boolean" | "array" | "null";
}): boolean {
  return (
    node.type === type ||
    (type === "number" && node.type === "integer") ||
    (Array.isArray(node.type) && node.type.includes(type))
  );
}
function _validateChoices({
  control,
  context,
}: {
  control: Readonly<Extract<StockControl, { optionsFrom: object }>>;
  context: Readonly<Context>;
}): void {
  const source = control.optionsFrom;
  const nodes = _requirePath({
    nodes: source.scope === "item" ? context.item : context.root,
    path: source.path,
    location: context.location,
  });
  const items = _items(nodes);
  _requirePath({
    nodes: items,
    path: source.valueKey,
    location: `${context.location}.optionsFrom`,
  });
  _requirePath({
    nodes: items,
    path: source.labelKey,
    location: `${context.location}.optionsFrom`,
  });
}
function _validateChildren({
  control,
  context,
}: {
  control: Readonly<StockControl>;
  context: Readonly<Context>;
}): void {
  match(control)
    .with({ kind: "object" }, (matchedControl) => {
      matchedControl.controls.forEach((child) =>
        _validateControl({ control: child, context }),
      );
    })
    .with({ kind: "collection" }, (matchedControl) => {
      const items = _items(context.current);
      if (!items.length) {
        throw new Error(
          `Stock collection has no item schema: ${context.location}`,
        );
      }
      matchedControl.itemControls.forEach((child) => {
        _validateControl({
          control: child,
          context: { ...context, current: items, item: items },
        });
        const editorItems = _branches([matchedControl.itemSchema]);
        _validateControl({
          control: child,
          context: {
            ...context,
            current: editorItems,
            item: editorItems,
          },
        });
      });
    })
    .with({ kind: "union" }, (matchedControl) => {
      matchedControl.variants.forEach((variant) => {
        const current = context.current.filter((node) =>
          _hasType({ node, type: variant.valueType }),
        );
        _validateControl({
          control: variant.control,
          context: { ...context, current },
        });
      });
    })
    .with({ kind: "select" }, (matchedControl) => {
      if ("optionsFrom" in matchedControl) {
        _validateChoices({ control: matchedControl, context });
      }
    })
    .with({ kind: P.union("text", "number", "boolean") }, () => undefined)
    .exhaustive();
}
function _validateControl({
  control,
  context,
}: {
  control: Readonly<StockControl>;
  context: Readonly<Context>;
}): void {
  const current = _requirePath({
    nodes: context.current,
    path: control.path,
    location: context.location,
  });
  const location = [context.location, control.path].filter(Boolean).join(".");
  if (
    control.nullable &&
    !current.some((node) => _hasType({ node, type: "null" }))
  ) {
    throw new Error(
      `Stock control is nullable but its schema is not: ${location}`,
    );
  }
  const expected = {
    text: "string",
    number: "number",
    boolean: "boolean",
    collection: "array",
  } as const;
  if (control.kind in expected) {
    const type = expected[control.kind as keyof typeof expected];
    if (!current.some((node) => _hasType({ node, type }))) {
      throw new Error(`Stock control kind does not match schema: ${location}`);
    }
  }
  _validateChildren({ control, context: { ...context, current, location } });
}

/**
 * Rejects editor paths and dynamic choices absent from their schema contexts.
 */
export function validateStockControls({
  id,
  schema,
  controls,
}: Readonly<{
  id: string;
  schema: StockJsonSchema;
  controls: StockControl[];
}>): void {
  controls.forEach((control) =>
    _validateControl({
      control,
      context: {
        root: [schema],
        current: [schema],
        item: [],
        location: id,
      },
    }),
  );
}

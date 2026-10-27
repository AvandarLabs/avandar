import { parseStockInput } from "../../../../stock/contracts/parseStockInput/parseStockInput";
import { StockCopyMessages } from "../../../../stock/i18n/StockCopyMessages";
import { stockContracts } from "../../../../stock/registry/stockContracts";
import type {
  StockInputByPreset,
  StockJsonSchema,
  StockJsonValue,
  StockPresetId,
} from "../../../../stock/contracts/StockContract.types";

type InputPath = Array<string | number>;
/** Invalid authored values coexist with the last schema-valid render input. */
export type ContentDraft = {
  draft: StockJsonValue;
  resolvedInput: StockInputByPreset[StockPresetId];
  issues: Array<{
    path: InputPath;
    code: string;
  }>;
  isValid: boolean;
  rowKeys: Record<string, string[]>;
};
let itemSequence: number = 0;
function _newRowKey(): string {
  itemSequence += 1;
  return `editor-row-${itemSequence}`;
}
function _collectRowKeys({
  value,
  path = [],
  existing = {},
}: {
  value: StockJsonValue;
  path?: InputPath;
  existing?: Record<string, string[]>;
}): Record<string, string[]> {
  if (!value || typeof value !== "object") {
    return {};
  }
  const nested = Object.entries(value).flatMap(([key, item]) =>
    Object.entries(
      _collectRowKeys({
        value: item,
        path: [...path, Array.isArray(value) ? Number(key) : key],
        existing,
      }),
    ),
  );
  return {
    ...Object.fromEntries(nested),
    ...(Array.isArray(value)
      ? {
          [JSON.stringify(path)]: value.map(
            (_, index) =>
              existing[JSON.stringify(path)]?.[index] ?? _newRowKey(),
          ),
        }
      : {}),
  };
}
/** Inputs for validate. */
type ValidateOptions = {
  preset: StockPresetId;
  state: ContentDraft;
  draft: StockJsonValue;
  rowKeys?: Record<string, string[]>;
};

function _validate({
  preset,
  state,
  draft,
  rowKeys = state.rowKeys,
}: ValidateOptions): ContentDraft {
  const parsed = stockContracts[preset].inputSchema.safeParse(draft);
  return {
    draft,
    rowKeys: _collectRowKeys({ value: draft, path: [], existing: rowKeys }),
    resolvedInput: parsed.success ? parsed.data : state.resolvedInput,
    isValid: parsed.success,
    issues: parsed.success
      ? []
      : parsed.error.issues.map((issue) => ({
          path: issue.path.map((key) =>
            typeof key === "number" ? key : String(key),
          ),
          code: issue.code,
        })),
  };
}
function _setValue({
  value,
  path,
  replacement,
}: {
  value: StockJsonValue;
  path: InputPath;
  replacement: StockJsonValue;
}): StockJsonValue {
  if (!path.length) {
    return replacement;
  }
  const [key, ...remainder] = path;
  if (Array.isArray(value)) {
    return value.map((item, index) =>
      index === key
        ? _setValue({ value: item, path: remainder, replacement })
        : item,
    );
  }
  if (!value || typeof value !== "object") {
    throw new Error("Invalid draft field path");
  }
  return {
    ...value,
    [key]: _setValue({ value: value[key], path: remainder, replacement }),
  };
}
/** Starts one independent, fully resolved English content document. */
function _makeContentDraftFromPreset(preset: StockPresetId): ContentDraft {
  const resolvedInput = parseStockInput({ preset: preset });
  const draft = structuredClone(resolvedInput) as StockJsonValue;
  return {
    draft,
    resolvedInput,
    issues: [],
    isValid: true,
    rowKeys: _collectRowKeys({ value: draft }),
  };
}
/**
 * Restores every content field while leaving palette and saved references
 * alone.
 */
const _resetContentDraft: (preset: StockPresetId) => ContentDraft =
  _makeContentDraftFromPreset;
/** Inputs for editContentDraft. */
type EditContentDraftOptions = {
  preset: StockPresetId;
  state: ContentDraft;
  path: InputPath;
  value: StockJsonValue;
};

/**
 * Parses every edit without replacing invalid authored values with defaults.
 */
function _editContentDraft({
  preset,
  state,
  path,
  value,
}: Readonly<EditContentDraftOptions>): ContentDraft {
  return _validate({
    preset,
    state,
    draft: _setValue({ value: state.draft, path, replacement: value }),
  });
}
/**
 * Creates editable empty data without adding fields forbidden by the schema.
 */
function _getBlankValueFromSchema(
  schema: Readonly<StockJsonSchema>,
): StockJsonValue {
  if (schema.type === "object") {
    return Object.fromEntries(
      Object.entries(schema.properties ?? {}).map(([key, child]) => [
        key,
        typeof child === "object" ? _getBlankValueFromSchema(child) : "",
      ]),
    );
  }
  if (schema.prefixItems) {
    return schema.prefixItems.map((child) =>
      typeof child === "object" ? _getBlankValueFromSchema(child) : "",
    );
  }
  if (schema.type === "array") {
    return Array.from(
      {
        length: schema.minItems ?? 0,
      },
      () =>
        schema.items &&
        typeof schema.items === "object" &&
        !Array.isArray(schema.items)
          ? _getBlankValueFromSchema(schema.items)
          : "",
    );
  }
  if (schema.type === "boolean") {
    return false;
  }
  if (schema.type === "number" || schema.type === "integer") {
    return "";
  }
  return "";
}
/** Inputs for addDraftItem. */
type AddDraftItemOptions = {
  preset: StockPresetId;
  state: ContentDraft;
  path: InputPath;
  schema: StockJsonSchema;
};

/** Adds a blank item, giving schema-defined IDs unique editable values. */
function _addDraftItem({
  preset,
  state,
  path,
  schema,
}: Readonly<AddDraftItemOptions>): ContentDraft {
  const items = StockCopyMessages.getValueFromPath({
    value: state.draft,
    path,
  });
  if (!Array.isArray(items)) {
    throw new Error("Expected draft collection");
  }
  const item = (() => {
    const blankItem = _getBlankValueFromSchema(schema);
    if (
      blankItem &&
      !Array.isArray(blankItem) &&
      typeof blankItem === "object" &&
      schema.properties?.id
    ) {
      const ids = new Set(
        items.map((value: unknown) =>
          value && typeof value === "object"
            ? Reflect.get(value, "id")
            : undefined,
        ),
      );
      let contentId = `item-${++itemSequence}`;
      while (ids.has(contentId)) contentId = `item-${++itemSequence}`;
      return { ...blankItem, id: contentId };
    }
    return blankItem;
  })();
  const rowKeys = {
    ...state.rowKeys,
    [JSON.stringify(path)]: [
      ...(state.rowKeys[JSON.stringify(path)] ?? items.map(_newRowKey)),
      _newRowKey(),
    ],
    ..._collectRowKeys({ value: item, path: [...path, items.length] }),
  };
  return _validate({
    preset,
    state,
    draft: _setValue({
      value: state.draft,
      path,
      replacement: [...items, item],
    }),
    rowKeys,
  });
}
/** Inputs for removeDraftItem. */
type RemoveDraftItemOptions = {
  preset: StockPresetId;
  state: ContentDraft;
  path: InputPath;
  index: number;
};

/** Removes exactly one row and retains every surviving editor-only identity. */
function _removeDraftItem({
  preset,
  state,
  path,
  index,
}: Readonly<RemoveDraftItemOptions>): ContentDraft {
  const items = StockCopyMessages.getValueFromPath({
    value: state.draft,
    path,
  });
  if (!Array.isArray(items)) {
    throw new Error("Expected draft collection");
  }
  const rowKeys = Object.fromEntries(
    Object.entries(state.rowKeys).flatMap(([key, keys]) => {
      const keyPath: InputPath = JSON.parse(key);
      if (key === JSON.stringify(path)) {
        return [[key, keys.filter((_, position) => position !== index)]];
      }
      if (
        keyPath.length > path.length &&
        path.every((segment, position) => segment === keyPath[position])
      ) {
        const position = Number(keyPath[path.length]);
        if (position === index) {
          return [];
        }
        if (position > index) {
          keyPath[path.length] = position - 1;
        }
      }
      return [[JSON.stringify(keyPath), keys]];
    }),
  );
  return _validate({
    preset,
    state,
    draft: _setValue({
      value: state.draft,
      path,
      replacement: items.filter((_, position) => position !== index),
    }),
    rowKeys,
  });
}

/** Related content draft module operations. */
export const ContentDraftModule = {
  /** Starts one independent, fully resolved English content document. */
  fromPreset: _makeContentDraftFromPreset,
  /**
   * Restores every content field while leaving palette and saved references
   * alone.
   */
  resetFromPreset: _resetContentDraft,
  /**
   * Parses every edit without replacing invalid authored values with defaults.
   */
  edit: _editContentDraft,
  /**
   * Creates editable empty data without adding fields forbidden by the schema.
   */
  getBlankValueFromSchema: _getBlankValueFromSchema,
  /** Adds a blank item, giving schema-defined IDs unique editable values. */
  addItem: _addDraftItem,
  /**
   * Removes exactly one row and retains every surviving editor-only identity.
   */
  removeItem: _removeDraftItem,
} satisfies {
  fromPreset: typeof _makeContentDraftFromPreset;
  resetFromPreset: typeof _resetContentDraft;
  edit: typeof _editContentDraft;
  getBlankValueFromSchema: typeof _getBlankValueFromSchema;
  addItem: typeof _addDraftItem;
  removeItem: typeof _removeDraftItem;
};

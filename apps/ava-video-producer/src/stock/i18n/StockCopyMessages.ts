import { decodeDefaultSpan } from "./decodeDefaultSpan/decodeDefaultSpan";
import { STOCK_GRAPHIC_COPY } from "./stockGraphicCopy";
import type {
  StockContract,
  StockDefaultSpanBinding,
  StockMessageDescriptor,
} from "../contracts/StockContract.types";

/** Stable IDs name the visible slot without including its authored content. */
function _getStockDefaultMessageIdFromPath({
  id,
  path,
}: {
  id: string;
  path: ReadonlyArray<string | number>;
}): string {
  return `motionAtlas.${id}.default.${path.join(".")}`;
}

/** Reads one JSON-compatible field without interpreting IDs or references. */
function _getStockValueFromPath({
  value,
  path,
}: {
  value: unknown;
  path: ReadonlyArray<string | number>;
}): unknown {
  return path.reduce<unknown>(
    (item, key) =>
      item !== null && typeof item === "object"
        ? Reflect.get(item, key)
        : undefined,
    value,
  );
}
function _valueAtOwnPath({
  value,
  path,
}: {
  value: unknown;
  path: ReadonlyArray<string | number>;
}): unknown {
  if (!path.length) {
    throw new Error("A default span path cannot be empty.");
  }
  return path.reduce<unknown>((item, key) => {
    if (
      (typeof key !== "string" && typeof key !== "number") ||
      (typeof key === "number" && (!Number.isInteger(key) || key < 0)) ||
      ["__proto__", "prototype", "constructor"].includes(String(key)) ||
      (Array.isArray(item) && typeof key !== "number") ||
      item === null ||
      typeof item !== "object" ||
      !Object.hasOwn(item, key)
    ) {
      throw new Error(`Invalid default span path: ${path.join(".")}`);
    }
    return Reflect.get(item, key);
  }, value);
}
function _validateSpanBinding({
  contract,
  binding,
}: {
  contract: Readonly<StockContract<unknown>>;
  binding: StockDefaultSpanBinding;
}): void {
  const pathKey = JSON.stringify(binding.textPath);
  if (
    contract.defaultTextPaths.filter((path) => JSON.stringify(path) === pathKey)
      .length !== 1
  ) {
    throw new Error(
      "A default span text path must occur exactly once in defaultTextPaths.",
    );
  }
  const text = _valueAtOwnPath({
    value: contract.defaultInput,
    path: binding.textPath,
  });
  const start = _valueAtOwnPath({
    value: contract.defaultInput,
    path: binding.startPath,
  });
  const end = _valueAtOwnPath({
    value: contract.defaultInput,
    path: binding.endPath,
  });
  const decoded = decodeDefaultSpan(binding.template);
  if (
    typeof text !== "string" ||
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    text !== decoded.text ||
    start !== decoded.contentStart ||
    end !== decoded.contentEnd
  ) {
    throw new Error(
      "A default span template must reproduce its English text and exact offsets.",
    );
  }
}

/**
 * Validates explicit bindings without changing the contract's normal input
 * boundary.
 */
function _getStockDefaultSpanBindingsFromContract(
  contract: StockContract<unknown>,
): Map<string, StockDefaultSpanBinding> {
  const bindings = new Map<string, StockDefaultSpanBinding>();
  const targets = new Set<string>();
  (contract.defaultSpanBindings ?? []).forEach((binding) => {
    _validateSpanBinding({ contract, binding });
    [binding.textPath, binding.startPath, binding.endPath].forEach((path) => {
      const key = JSON.stringify(path);
      if (targets.has(key)) {
        throw new Error("Duplicate default span path.");
      }
      targets.add(key);
    });
    bindings.set(JSON.stringify(binding.textPath), binding);
  });
  return bindings;
}
function _collectDescriptors(value: unknown): StockMessageDescriptor[] {
  if (!value || typeof value !== "object") {
    return [];
  }
  if (
    "id" in value &&
    "message" in value &&
    typeof value.id === "string" &&
    typeof value.message === "string"
  ) {
    return [
      {
        id: value.id,
        message: value.message,
      },
    ];
  }
  return Object.values(value).flatMap(_collectDescriptors);
}

/** Collects canonical visible copy and rejects ambiguous stable message IDs. */
function _getStockMessagesFromContract(
  contracts: Readonly<Record<string, StockContract<unknown>>>,
): Record<string, string> {
  const messages: Record<string, string> = {};
  Object.values(contracts).forEach((contract) => {
    const bindings = _getStockDefaultSpanBindingsFromContract(contract);
    const descriptors = _collectDescriptors([
      STOCK_GRAPHIC_COPY,
      contract.displayCopy,
      contract.metadata,
      contract.controls,
      contract.bindingExamples.map((example) => example.sourceText),
    ]);
    contract.defaultTextPaths.forEach((path) => {
      const message =
        bindings.get(JSON.stringify(path))?.template ??
        _getStockValueFromPath({ value: contract.defaultInput, path });
      if (typeof message !== "string") {
        throw new Error(
          `Default text path is not a string: ${contract.id}.${path.join(".")}`,
        );
      }
      descriptors.push({
        id: _getStockDefaultMessageIdFromPath({ id: contract.id, path }),
        message,
      });
    });
    descriptors.forEach(({ id, message }) => {
      if (Object.hasOwn(messages, id) && messages[id] !== message) {
        throw new Error(`Conflicting stock message ID: ${id}`);
      }
      messages[id] = message;
    });
  });
  return Object.fromEntries(
    Object.entries(messages).sort(([first], [second]) =>
      first.localeCompare(second),
    ),
  );
}

/** Related stock copy messages operations. */
export const StockCopyMessages = {
  /**
   * Stable IDs name the visible slot without including its authored content.
   */
  getDefaultMessageIdFromPath: _getStockDefaultMessageIdFromPath,
  /** Reads one JSON-compatible field without interpreting IDs or references. */
  getValueFromPath: _getStockValueFromPath,
  /**
   * Validates explicit bindings without changing the contract's normal input
   * boundary.
   */
  getDefaultSpanBindingsFromContract: _getStockDefaultSpanBindingsFromContract,
  /**
   * Collects canonical visible copy and rejects ambiguous stable message IDs.
   */
  getMessagesFromContract: _getStockMessagesFromContract,
} satisfies {
  getDefaultMessageIdFromPath: typeof _getStockDefaultMessageIdFromPath;
  getValueFromPath: typeof _getStockValueFromPath;
  getDefaultSpanBindingsFromContract: typeof _getStockDefaultSpanBindingsFromContract;
  getMessagesFromContract: typeof _getStockMessagesFromContract;
};

import { decodeDefaultSpan } from "./decodeDefaultSpan/decodeDefaultSpan";
import { sourceMessages } from "./messages.en.generated";
import { StockCopyMessages } from "./StockCopyMessages";
import type {
  StockContract,
  StockMessageDescriptor,
} from "../contracts/StockContract.types";
import type { I18n } from "@lingui/core";
type ResolvedCopy<Value> = Value extends StockMessageDescriptor
  ? string
  : Value extends Array<infer Item>
    ? Array<ResolvedCopy<Item>>
    : Value extends object
      ? { [Key in keyof Value]: ResolvedCopy<Value[Key]> }
      : Value;
function _translate({
  descriptor,
  i18n,
}: {
  descriptor: StockMessageDescriptor;
  i18n: I18n;
}): string {
  return i18n.locale === "en" &&
    sourceMessages[descriptor.id] !== descriptor.message
    ? descriptor.message
    : i18n._(descriptor);
}
function _resolveDescriptors<Value>({
  value,
  i18n,
}: {
  value: Value;
  i18n: I18n;
}): ResolvedCopy<Value> {
  if (!value || typeof value !== "object") {
    return value as ResolvedCopy<Value>;
  }
  if (
    "id" in value &&
    "message" in value &&
    typeof value.id === "string" &&
    typeof value.message === "string"
  ) {
    return _translate({
      descriptor: value as StockMessageDescriptor,
      i18n,
    }) as ResolvedCopy<Value>;
  }
  if (Array.isArray(value)) {
    return value.map((item) =>
      _resolveDescriptors({ value: item, i18n }),
    ) as ResolvedCopy<Value>;
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      _resolveDescriptors({ value: item, i18n }),
    ]),
  ) as ResolvedCopy<Value>;
}

function _setDefaultValue({
  input,
  path,
  value,
}: {
  input: unknown;
  path: ReadonlyArray<string | number>;
  value: unknown;
}): void {
  const parent = StockCopyMessages.getValueFromPath({
    value: input,
    path: path.slice(0, -1),
  });
  Reflect.set(parent as object, path.at(-1)!, value);
}

/**
 * Resolves display copy and a cloned full default. Authored input stays
 * separate.
 */
export function makeLocalizedStockDataFromContract<
  Contract extends StockContract<unknown>,
>({
  contract,
  i18n,
}: Readonly<{ contract: Contract; i18n: I18n }>): {
  metadata: ResolvedCopy<StockContract<unknown>["metadata"]>;
  controls: ResolvedCopy<StockContract<unknown>["controls"]>;
  defaultInput: Contract["defaultInput"];
} {
  const bindings =
    StockCopyMessages.getDefaultSpanBindingsFromContract(contract);
  const defaultInput = structuredClone(contract.defaultInput);
  contract.defaultTextPaths.forEach((path) => {
    const binding = bindings.get(JSON.stringify(path));
    const message =
      binding?.template ??
      StockCopyMessages.getValueFromPath({ value: defaultInput, path });
    if (typeof message !== "string") {
      throw new Error(
        `Invalid default text path: ${contract.id}.${path.join(".")}`,
      );
    }
    const translated = _translate({
      descriptor: {
        id: StockCopyMessages.getDefaultMessageIdFromPath({
          id: contract.id,
          path,
        }),
        message,
      },
      i18n,
    });
    if (binding) {
      const decoded = decodeDefaultSpan(translated);
      _setDefaultValue({ input: defaultInput, path, value: decoded.text });
      _setDefaultValue({
        input: defaultInput,
        path: binding.startPath,
        value: decoded.contentStart,
      });
      _setDefaultValue({
        input: defaultInput,
        path: binding.endPath,
        value: decoded.contentEnd,
      });
    } else {
      _setDefaultValue({ input: defaultInput, path, value: translated });
    }
  });
  return {
    metadata: _resolveDescriptors({ value: contract.metadata, i18n }),
    controls: _resolveDescriptors({ value: contract.controls, i18n }),
    defaultInput,
  };
}

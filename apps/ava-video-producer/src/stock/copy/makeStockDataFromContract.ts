import type {
  StockContract,
  StockMessageDescriptor,
} from "../contracts/StockContract.types";

type ResolvedCopy<Value> = Value extends StockMessageDescriptor
  ? string
  : Value extends Array<infer Item>
    ? Array<ResolvedCopy<Item>>
    : Value extends object
      ? { [Key in keyof Value]: ResolvedCopy<Value[Key]> }
      : Value;

function _isDescriptor(value: object): value is StockMessageDescriptor {
  return (
    "id" in value &&
    "message" in value &&
    typeof value.id === "string" &&
    typeof value.message === "string"
  );
}

function _resolveDescriptors<Value>(value: Value): ResolvedCopy<Value> {
  if (!value || typeof value !== "object") {
    return value as ResolvedCopy<Value>;
  }
  if (_isDescriptor(value)) {
    return value.message as ResolvedCopy<Value>;
  }
  if (Array.isArray(value)) {
    return value.map(_resolveDescriptors) as ResolvedCopy<Value>;
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, _resolveDescriptors(item)]),
  ) as ResolvedCopy<Value>;
}

/**
 * Resolves display copy to plain English strings and returns a cloned full
 * default. Authored input stays separate.
 */
export function makeStockDataFromContract<
  Contract extends StockContract<unknown>,
>({ contract }: Readonly<{ contract: Contract }>): {
  metadata: ResolvedCopy<StockContract<unknown>["metadata"]>;
  controls: ResolvedCopy<StockContract<unknown>["controls"]>;
  defaultInput: Contract["defaultInput"];
} {
  return {
    metadata: _resolveDescriptors(contract.metadata),
    controls: _resolveDescriptors(contract.controls),
    defaultInput: structuredClone(contract.defaultInput),
  };
}

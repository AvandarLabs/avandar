import { SetRequired, UnionToIntersection } from "type-fest";
import { unknownToString } from "./transformations";

type KeyMatcher<Key> = ((key: Key) => unknown) | string | number | boolean;

type ValueRecord<Key extends PropertyKey> = UnionToIntersection<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Key extends any ?
    {
      [K in Key]: KeyMatcher<K>;
    }
  : never
> & { _otherwise?: KeyMatcher<unknown> };

type MappedValue<Key extends PropertyKey, Values extends ValueRecord<Key>> =
  Key extends keyof Values ?
    Values[Key] extends (key: Key) => infer R ?
      R
    : Values[Key]
  : never;

const fallbackError = (failedKey: unknown): never => {
  throw new Error(
    `No matching value found for input: ${unknownToString(failedKey)}`,
  );
};

export function matchLiteral<
  Key extends PropertyKey,
  Values extends ValueRecord<Key>,
>(
  key: Key,
  { _otherwise = fallbackError, ...values }: Values,
):
  | MappedValue<Key, Values>
  | MappedValue<"_otherwise", SetRequired<Values, "_otherwise">> {
  if (key in values) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (values as any)[key];
    return typeof value === "function" ? value(key) : value;
  } else {
    if (_otherwise) {
      return (
        typeof _otherwise === "function" ?
          _otherwise(key)
        : _otherwise) as MappedValue<
        "_otherwise",
        SetRequired<Values, "_otherwise">
      >;
    } else {
      return fallbackError(key);
    }
  }
}

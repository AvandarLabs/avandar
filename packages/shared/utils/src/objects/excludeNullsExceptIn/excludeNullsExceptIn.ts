import { isNull } from "../../guards/isNull/isNull.ts";
import { objectKeys } from "../objectKeys.ts";
import type { UnknownObject } from "../../types/common.ts";
import type { StringKeyOf } from "../../types/utilityTypes.ts";

/**
 * The result type of `excludeNullsExceptIn`.
 */
export type ExcludeNullsExceptIn<
  T extends UnknownObject,
  KeysToNotChange extends StringKeyOf<T>,
  KeysToExcludeNulls extends StringKeyOf<T> = Exclude<
    StringKeyOf<T>,
    KeysToNotChange
  >,
> = Pick<T, KeysToNotChange> & {
  [Key in KeysToExcludeNulls]: Exclude<T[Key], null>;
};

/**
 * Excludes nulls from all keys except for the specified
 * keys. Those keys will continue to allow `null` values.
 * This is a shallow operation.
 *
 * If no keys are specified, we assume `keysToKeepNull`
 * is the entire object. Therefore, the object is left
 * unchanged.
 *
 * At the type level, any keys that can possibly be `null`
 * will now have a union with `undefined`.
 *
 * @param obj The object to exclude nulls from.
 * @param keysToKeepNull The keys to keep nulls for.
 * @returns A new object with nulls excluded from all keys
 * except the specified keys.
 */
export function excludeNullsExceptIn<
  T extends UnknownObject,
  K extends StringKeyOf<T>,
>(obj: T, keysToKeepNull: K | readonly K[]): ExcludeNullsExceptIn<T, K> {
  const keys =
    typeof keysToKeepNull === "string" ? [keysToKeepNull] : keysToKeepNull;
  if (keys.length === 0) {
    return obj as ExcludeNullsExceptIn<T, K>;
  }
  const keysToSkip: Set<string> = new Set(keys.map(String));
  const newObj = {} as UnknownObject;
  objectKeys(obj).forEach((key) => {
    if (keysToSkip.has(key) || !isNull(obj[key])) {
      newObj[key] = obj[key];
    }
  });
  return newObj as ExcludeNullsExceptIn<T, K>;
}

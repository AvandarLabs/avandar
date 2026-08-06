import { getValue } from "@utils";

/**
 * Read a descriptor's value out of a config/series by dotted path, returning
 * `undefined` (rather than throwing) when the path is unset.
 */
export function readSetting(obj: unknown, key: string): unknown {
  return getValue(obj as never, key as never, { throwError: false });
}

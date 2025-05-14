import { usePrevious } from "@mantine/hooks";
import { useEffect } from "react";
import { isNotUndefined } from "../utils/guards";

/**
 * Calls `callback` when `value` changes from `undefined` to any value.
 * @param value The value to watch for definedness.
 * @param callback The callback to call when `value` is no longer `undefined`.
 */
export function useOnBecomesDefined<T>(
  value: T,
  callback: (value: Exclude<T, undefined>) => void,
): void {
  const prevValue = usePrevious(value);

  useEffect(() => {
    if (prevValue === undefined && isNotUndefined(value)) {
      callback(value);
    }
  }, [prevValue, value, callback]);
}

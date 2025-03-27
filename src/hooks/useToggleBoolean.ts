import { useCallback, useState } from "react";

/**
 * Hook to manage a boolean state.
 *
 * Similar to Mantine's `useBoolean` but returns the toggle function
 * as the second argument (the first handler) so it is easier to use
 * for uses that only need to toggle a boolean.
 *
 * If you also need to specifically set `true` or `false` then use
 * `useBoolean` or Mantine's `useDisclosure` instead.
 *
 * @param initialState - The initial state of the boolean
 * @returns An array containing the current state and a handler to toggle it.
 */
export function useToggleBoolean(initialState: boolean): [boolean, () => void] {
  const [bool, setBool] = useState<boolean>(initialState);
  const toggle = useCallback(() => {
    setBool((prev) => !prev);
  }, []);
  return [bool, toggle];
}

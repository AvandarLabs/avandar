import { useCallback, useState } from "react";

/**
 * Hook to manage a boolean state.
 *
 * Similar to Mantine's `useDisclosure` hook but returns an array rather
 * than an object of handlers, so that the state can be renamed more easily.
 * This makes it more readable for uses that aren't related to open/close
 * state.
 *
 * @param initialState - The initial state of the boolean
 * @returns A tuple containing the current state and handlers to set it to
 * true, false, or toggle
 */
export function useBoolean(
  initialState: boolean,
): [
  state: boolean,
  setTrue: () => void,
  setFalse: () => void,
  toggle: () => void,
] {
  const [bool, setBool] = useState<boolean>(initialState);

  const setTrue = useCallback(() => {
    setBool(true);
  }, []);

  const setFalse = useCallback(() => {
    setBool(false);
  }, []);

  const toggle = useCallback(() => {
    setBool((prev) => {
      return !prev;
    });
  }, []);

  return [bool, setTrue, setFalse, toggle];
}

import { useMemo, useRef } from "react";

/** {@link useLatestRequest}'s return value. */
export type LatestRequest<TVariables> = {
  /** Records `variables` as the latest call, and returns them to send. */
  claim: (variables: TVariables) => TVariables;

  /** Whether a response's `variables` belong to the latest call. */
  isLatest: (variables: TVariables) => boolean;

  /** Marks every call so far as stale, such as when the selection changes. */
  forget: () => void;
};

/**
 * Tracks which call of a mutation is the latest, so the mutation's handlers
 * can drop a response to an earlier call instead of letting it overwrite the
 * state a newer call owns. A mutation's handlers run for every call, and each
 * receives the exact `variables` object its call was made with, so identity
 * tells the calls apart.
 */
export function useLatestRequest<TVariables>(): LatestRequest<TVariables> {
  const latestVariablesRef = useRef<TVariables | undefined>(undefined);

  // Memoized so the returned object, and so every callback that depends on
  // it, stays stable across renders.
  return useMemo(() => {
    return {
      claim: (variables: TVariables) => {
        latestVariablesRef.current = variables;
        return variables;
      },
      isLatest: (variables: TVariables) => {
        return variables === latestVariablesRef.current;
      },
      forget: () => {
        latestVariablesRef.current = undefined;
      },
    };
  }, []);
}

import { useEffect } from "react";
import { DiscoveryCandidateValues } from "../DiscoveryCandidateValues/DiscoveryCandidateValues";
import type { DiscoveryResolution } from "./useDiscoveryOptions";
import type { DiscoveryResolver } from "@/components/ChatPanel/chatClarify.types";

const MAX_DISCOVERY_ATTEMPTS = 3;

type DiscoveryResult =
  | { kind: "ready"; values: string[] }
  | { kind: "error"; error: string }
  | { kind: "empty" };

type QueryWithRetriesParameters = {
  query: string;
  column: string;
  resolveDiscovery: DiscoveryResolver;
  fallbackError: string;
  onAttempt: (attempt: number) => void;
  attempt?: number;
};

type StartDiscoveryParameters = {
  query: string;
  column: string;
  resolveDiscovery: DiscoveryResolver | undefined;
  candidateValues: readonly string[];
  multi: boolean;
  onUniqueMatch?: (
    storedValue: string,
  ) => boolean | void | Promise<boolean | void>;
  fallbackError: string;
  unavailableError: string;
  retry: () => void;
  setDiscoveryState: (state: DiscoveryResolution) => void;
};

async function _queryWithRetries(
  options: Readonly<QueryWithRetriesParameters>,
): Promise<DiscoveryResult> {
  const { attempt = 1 } = options;
  options.onAttempt(attempt);
  try {
    const result = await options.resolveDiscovery({
      query: options.query,
      column: options.column,
    });
    if ("values" in result) {
      return result.values.length > 0 ?
          { kind: "ready", values: result.values }
        : { kind: "empty" };
    }
    return attempt < MAX_DISCOVERY_ATTEMPTS ?
        _queryWithRetries({ ...options, attempt: attempt + 1 })
      : { kind: "error", error: result.error };
  } catch (error) {
    return attempt < MAX_DISCOVERY_ATTEMPTS ?
        _queryWithRetries({ ...options, attempt: attempt + 1 })
      : {
          kind: "error",
          error: error instanceof Error ? error.message : options.fallbackError,
        };
  }
}

function _getUniqueMatch(
  options: Readonly<{
    result: DiscoveryResult;
    startOptions: Readonly<StartDiscoveryParameters>;
  }>,
): string | undefined {
  return options.result.kind === "ready" && !options.startOptions.multi ?
      DiscoveryCandidateValues.getUniqueMatch({
        candidateValues: options.startOptions.candidateValues,
        discoveredValues: options.result.values,
      })
    : undefined;
}

async function _submitUniqueMatch(
  options: Readonly<{
    storedValue: string | undefined;
    startOptions: Readonly<StartDiscoveryParameters>;
  }>,
): Promise<boolean> {
  if (!options.storedValue || !options.startOptions.onUniqueMatch) {
    return false;
  }
  try {
    return (
      (await options.startOptions.onUniqueMatch(options.storedValue)) !== false
    );
  } catch {
    return false;
  }
}

function _startDiscovery(
  options: Readonly<StartDiscoveryParameters>,
): () => void {
  let isCancelled = false;
  if (!options.resolveDiscovery) {
    options.setDiscoveryState({
      kind: "error",
      error: options.unavailableError,
      retry: options.retry,
    });
    return () => {
      isCancelled = true;
    };
  }
  void _queryWithRetries({
    ...options,
    resolveDiscovery: options.resolveDiscovery,
    onAttempt: (attempt) => {
      if (!isCancelled) {
        options.setDiscoveryState({ kind: "loading", attempt });
      }
    },
  }).then(async (result) => {
    if (isCancelled) {
      return;
    }
    const storedValue = _getUniqueMatch({ result, startOptions: options });
    const wasSubmitted = await _submitUniqueMatch({
      storedValue,
      startOptions: options,
    });
    if (isCancelled || wasSubmitted) {
      return;
    }
    options.setDiscoveryState(
      result.kind === "error" ? { ...result, retry: options.retry } : result,
    );
  });
  return () => {
    isCancelled = true;
  };
}

/** Starts and cancels discovery queries as their inputs change. */
export function useStartDiscovery(
  options: Readonly<StartDiscoveryParameters & { retryVersion: number }>,
): void {
  const { query, column, resolveDiscovery, candidateValues, multi } = options;
  const { onUniqueMatch, fallbackError, unavailableError } = options;
  const { retry, retryVersion, setDiscoveryState } = options;
  const startDiscoveryForCurrentInputs = () => {
    return _startDiscovery({
      query,
      column,
      resolveDiscovery,
      candidateValues,
      multi,
      onUniqueMatch,
      fallbackError,
      unavailableError,
      retry,
      setDiscoveryState,
    });
  };
  useEffect(startDiscoveryForCurrentInputs, [
    query,
    column,
    resolveDiscovery,
    retry,
    retryVersion,
    fallbackError,
    unavailableError,
    candidateValues,
    multi,
    onUniqueMatch,
    setDiscoveryState,
  ]);
}

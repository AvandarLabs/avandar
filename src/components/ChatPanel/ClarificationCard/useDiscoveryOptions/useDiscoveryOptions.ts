import type { DiscoveryResolver } from "@/components/ChatPanel/chatClarify.types";

import { useLingui } from "@lingui/react/macro";
import { useCallback, useState } from "react";

import { useStartDiscovery } from "./useStartDiscovery";

const EMPTY_CANDIDATE_VALUES: readonly string[] = [];

type DiscoveryOptionsParameters = {
  query: string;
  column: string;
  resolveDiscovery: DiscoveryResolver | undefined;
  candidateValues?: readonly string[];
  multi?: boolean;
  onUniqueMatch?: (
    storedValue: string,
  ) => boolean | void | Promise<boolean | void>;
};

/** Current result of resolving a clarification discovery query. */
export type DiscoveryResolution =
  | { kind: "loading"; attempt: number }
  | { kind: "ready"; values: string[] }
  | { kind: "error"; error: string; retry: () => void }
  | { kind: "empty" };

/** Resolves the available options for a discovery clarification. */
export function useDiscoveryOptions(
  options: Readonly<DiscoveryOptionsParameters>,
): DiscoveryResolution {
  const {
    query,
    column,
    resolveDiscovery,
    candidateValues = EMPTY_CANDIDATE_VALUES,
    multi = false,
    onUniqueMatch,
  } = options;
  const [retryVersion, setRetryVersion] = useState(0);
  const [discoveryState, setDiscoveryState] = useState<DiscoveryResolution>({
    kind: "loading",
    attempt: 1,
  });
  const { t } = useLingui();
  const retry = useCallback(() => {
    setRetryVersion((currentVersion) => {
      return currentVersion + 1;
    });
  }, []);

  useStartDiscovery({
    query,
    column,
    resolveDiscovery,
    candidateValues,
    multi,
    onUniqueMatch,
    fallbackError: t`Query failed.`,
    unavailableError: t`Discovery is not available in this context.`,
    retry,
    retryVersion,
    setDiscoveryState,
  });

  return discoveryState;
}

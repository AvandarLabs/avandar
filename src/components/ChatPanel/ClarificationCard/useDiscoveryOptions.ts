import { useLingui } from "@lingui/react/macro";
import { useEffect, useState } from "react";
import { match, P } from "ts-pattern";
import type { DiscoveryResolver } from "@/components/ChatPanel/chatClarify.types";

/** Current result of resolving a clarification discovery query. */
export type DiscoveryResolution =
  | { kind: "loading" }
  | { kind: "ready"; values: string[] }
  | { kind: "error"; error: string }
  | { kind: "empty" };

/** Resolves the available options for a discovery clarification. */
export function useDiscoveryOptions(
  parameters: Readonly<{
    query: string;
    column: string;
    resolveDiscovery: DiscoveryResolver | undefined;
  }>,
): DiscoveryResolution {
  const { query, column, resolveDiscovery } = parameters;
  const [discoveryState, setDiscoveryState] = useState<DiscoveryResolution>({
    kind: "loading",
  });
  const { t } = useLingui();

  useEffect(
    function resolveDiscoveryValues() {
      let isCancelled = false;
      const resolveDiscoveryOptions = async (): Promise<void> => {
        if (!resolveDiscovery) {
          setDiscoveryState({
            kind: "error",
            error: t`Discovery is not available in this context.`,
          });
          return;
        }
        try {
          const result = await resolveDiscovery({ query, column });
          if (!isCancelled) {
            setDiscoveryState(
              match(result)
                .with({ error: P.string }, ({ error }) => {
                  return { kind: "error" as const, error };
                })
                .with({ values: [] }, () => {
                  return { kind: "empty" as const };
                })
                .with({ values: P.array(P.string) }, ({ values }) => {
                  return { kind: "ready" as const, values };
                })
                .exhaustive(),
            );
          }
        } catch (error) {
          if (!isCancelled) {
            setDiscoveryState({
              kind: "error",
              error: error instanceof Error ? error.message : t`Query failed.`,
            });
          }
        }
      };
      void resolveDiscoveryOptions();
      return () => {
        isCancelled = true;
      };
    },
    [query, column, resolveDiscovery, t],
  );

  return discoveryState;
}

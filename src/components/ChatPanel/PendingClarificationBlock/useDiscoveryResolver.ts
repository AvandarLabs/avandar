import type { DiscoveryResolver } from "@/components/ChatPanel/chatClarify.types";

import { isDefined } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { useCallback } from "react";

import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";

/**
 * Creates the callback that turns a discovery query into clarification
 * options.
 */
export function useDiscoveryResolver(): DiscoveryResolver {
  const { t } = useLingui();

  return useCallback<DiscoveryResolver>(
    async function resolveDiscoveryOptions(options) {
      try {
        const queryResult = await DuckDbClient.runRawQuery<
          Record<string, unknown>
        >(options.query);
        const values = queryResult.data
          .map((row) => {
            const rowKeys = Object.keys(row);
            const value = rowKeys.length > 0 ? row[rowKeys[0]!] : undefined;
            return value === null || value === undefined
              ? undefined
              : String(value);
          })
          .filter(isDefined)
          .filter((value) => {
            return value.length > 0;
          });
        const seenValues = new Set<string>();
        const deduplicatedValues: string[] = [];
        for (const value of values) {
          if (!seenValues.has(value)) {
            seenValues.add(value);
            deduplicatedValues.push(value);
            if (deduplicatedValues.length >= 100) {
              break;
            }
          }
        }
        return { values: deduplicatedValues };
      } catch (error) {
        return {
          error:
            error instanceof Error ? error.message : t`Discovery query failed.`,
        };
      }
    },
    [t],
  );
}

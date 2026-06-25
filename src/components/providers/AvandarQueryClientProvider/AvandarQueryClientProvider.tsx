import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import {
  makeCacheBuster,
  queryPersister,
} from "@/components/providers/AvandarQueryClientProvider/queryPersister";
import { AvaQueryClient } from "@/config/AvaQueryClient";
import type { ReactNode } from "react";

const DAY_MS = 24 * 60 * 60 * 1000;
const PERSIST_MAX_AGE_MS = 7 * DAY_MS;

type Props = {
  /**
   * The active user's id. Folded into the persisted-cache buster so two
   * users on the same browser do not read each other's cached data.
   */
  userId: string | undefined;
  children: ReactNode;
};

/**
 * Wires `AvaQueryClient` into `PersistQueryClientProvider` with the
 * Avandar persistence policy: IndexedDB-backed persister, 7-day max
 * age, per-user buster, and dehydration only of successful queries.
 */
export function AvandarQueryClientProvider({
  userId,
  children,
}: Props): JSX.Element {
  return (
    <PersistQueryClientProvider
      client={AvaQueryClient}
      persistOptions={{
        persister: queryPersister,
        maxAge: PERSIST_MAX_AGE_MS,
        buster: makeCacheBuster(userId),
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            return query.state.status === "success";
          },
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}

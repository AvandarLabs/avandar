import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import {
  makeCacheBuster,
  queryPersister,
} from "@/components/providers/AvandarQueryClientProvider/queryPersister/queryPersister";
import { AvaQueryClient } from "@/config/AvaQueryClient";
import type { User } from "$/models/User/User";
import type { ReactNode } from "react";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * How long the persisted React Query cache survives on disk before the
 * persister discards it on next boot. Effectively the maximum age of
 * "offline-usable" data: a user who has been offline for longer than
 * this will load with an empty cache and need a network round-trip to
 * repopulate it.
 */
const PERSIST_MAX_AGE_MS = 7 * DAY_MS;

type Props = {
  /**
   * The active user's id. Folded into the persisted-cache buster so two
   * users on the same browser do not read each other's cached data.
   */
  userId: User.Id | undefined;
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
          // Only successful queries get written to IndexedDB. Errors and
          // in-flight (loading) states are ephemeral — persisting them
          // would mean a cold reload could replay a stale error or a
          // never-resolving loading spinner forever.
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

import { CrosswalkClient } from "@/clients/crosswalks/CrosswalkClient";
import { CrosswalkColumnClient } from "@/clients/crosswalks/CrosswalkColumnClient";
import { CrosswalkDatasetClient } from "@/clients/crosswalks/CrosswalkDatasetClient";
import { CrosswalkLayoutClient } from "@/clients/crosswalks/CrosswalkLayoutClient";
import { CrosswalkMappingClient } from "@/clients/crosswalks/CrosswalkMappingClient";
import type { QueryClient } from "@tanstack/react-query";

/**
 * Marks every crosswalk query stale: the crosswalks list and each
 * crosswalk's five tables. Called after a crosswalk is saved or deleted.
 */
export async function invalidateCrosswalkQueries(
  queryClient: QueryClient,
): Promise<void> {
  await Promise.all(
    [
      CrosswalkClient,
      CrosswalkColumnClient,
      CrosswalkLayoutClient,
      CrosswalkDatasetClient,
      CrosswalkMappingClient,
    ].map((client) => {
      return queryClient.invalidateQueries({
        queryKey: [client.getClientName()],
      });
    }),
  );
}

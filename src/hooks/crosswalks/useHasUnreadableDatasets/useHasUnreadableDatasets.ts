import { CrosswalkClient } from "@/clients/crosswalks/CrosswalkClient";
import type { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk";

/**
 * Whether the crosswalk holds a dataset, in a layout that is not skipped,
 * that the signed-in user cannot open. Use it to stop someone from updating
 * a combined dataset that would silently leave that dataset out.
 *
 * Resolves to undefined until the answer is known, and stays undefined when
 * the lookup fails, so a caller never treats an unknown as "no". A crosswalk
 * that is not given (not saved yet) has none.
 */
export function useHasUnreadableDatasets(
  crosswalkId: Crosswalk.Id | undefined,
): boolean | undefined {
  const [hasUnreadable, , query] = CrosswalkClient.useHasUnreadableDatasets({
    crosswalkId: crosswalkId as Crosswalk.Id,
    useQueryOptions: { enabled: crosswalkId !== undefined },
  });
  if (crosswalkId === undefined) {
    return false;
  }
  return query.isError ? undefined : hasUnreadable;
}

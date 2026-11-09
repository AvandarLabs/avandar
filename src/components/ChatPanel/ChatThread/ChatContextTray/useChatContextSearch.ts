import { useQuery } from "@avandar/query-hooks";
import { useDebouncedValue } from "@mantine/hooks";
import { isChatMentionType } from "$/agent/mentions/ChatMentionToken";
import { GADGET_TYPES } from "$/models/gadgets/Gadget/Gadget";
import { searchGadgets } from "@/clients/gadgets/searchGadgets/searchGadgets";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { GadgetSearchResult } from "@/clients/gadgets/searchGadgets/searchGadgets";

/** How long typing must pause before the search runs. */
const SEARCH_DEBOUNCE_MS = 150;

/**
 * The most rows the search returns for one gadget type. Mirrors
 * `type_position <= 5` in `supabase/schemas/50.rpc_gadgets__search.sql`.
 */
const SEARCH_ROWS_PER_TYPE = 5;

/**
 * Rows asked of the search: every type's rows, as the `@` menu asks, so a
 * case row the picker drops never takes the place of an allowed row.
 */
const CHAT_CONTEXT_SEARCH_LIMIT = SEARCH_ROWS_PER_TYPE * GADGET_TYPES.length;

type ChatContextSearchState = {
  results: GadgetSearchResult[];

  /** True while a search runs or the typed query waits for its debounce. */
  isSearching: boolean;
  searchFailed: boolean;
};

/**
 * Gadget search for the context picker: the chat's types only (never a
 * case), debounced, and cached per query. A blank query lists recently
 * updated gadgets. Nothing is fetched while `isEnabled` is false, such as
 * while the picker is closed.
 */
export function useChatContextSearch(
  query: string,
  options: Readonly<{ isEnabled: boolean }>,
): ChatContextSearchState {
  const workspace = useCurrentWorkspace();
  const trimmedQuery = query.trim();
  const [debouncedQuery] = useDebouncedValue(trimmedQuery, SEARCH_DEBOUNCE_MS);
  const [results, , search] = useQuery({
    queryKey: ["chatContextSearch", workspace.id, debouncedQuery],
    enabled: options.isEnabled,
    queryFn: async ({ signal }) => {
      const allResults = await searchGadgets({
        workspaceId: workspace.id,
        query: debouncedQuery,
        limit: CHAT_CONTEXT_SEARCH_LIMIT,
        signal,
      });
      return allResults.filter((result) => {
        return isChatMentionType(result.ref.gadgetType);
      });
    },
  });
  const isWaitingForDebounce =
    options.isEnabled && trimmedQuery !== debouncedQuery;
  return {
    results: results ?? [],
    isSearching: search.isFetching || isWaitingForDebounce,
    searchFailed: search.isError && !search.isFetching,
  };
}

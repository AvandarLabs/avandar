import type { Gadget } from "$/models/gadgets/Gadget/Gadget";

/** One gadget search result, matching the product client's shape. */
export type GadgetSearchResult = {
  ref: Gadget.Ref;
  label: string;
  subLabel: string | undefined;
  hasLimitedAudience: boolean;
};

/** Film-only gadget search. The film never opens the composer's `@` menu,
 * and the real search calls a Supabase RPC, so it finds nothing.
 */
export async function searchGadgets(
  _params: Readonly<{
    workspaceId: string;
    query: string;
    limit: number;
    signal?: AbortSignal;
  }>,
): Promise<GadgetSearchResult[]> {
  return [];
}

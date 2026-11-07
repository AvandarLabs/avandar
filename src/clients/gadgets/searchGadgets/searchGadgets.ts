import { z } from "zod";
import { AvaSupabase } from "$/db/supabase/AvaSupabase";
import { GadgetRefSchema } from "$/models/gadgets/Gadget/Gadget";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";

/**
 * One gadget search result, such as an entry in the comment composer's `@`
 * menu.
 */
export type GadgetSearchResult = {
  ref: Gadget.Ref;
  label: string;
  subLabel: string | undefined;
  hasLimitedAudience: boolean;
};

// The generated RPC row type declares `sub_id` and `sub_label` as `string`,
// but both are SQL nulls for every gadget that is not a dashboard tile, so
// each row is parsed rather than trusted.
const GadgetSearchRowSchema = z.object({
  gadget_type: z.string(),
  gadget_id: z.string(),
  sub_id: z.string().nullable(),
  label: z.string(),
  sub_label: z.string().nullable(),
  has_limited_audience: z.boolean(),
});

function _rowToResult(row: unknown): GadgetSearchResult | undefined {
  const parsedRow = GadgetSearchRowSchema.safeParse(row);
  if (!parsedRow.success) {
    return undefined;
  }
  const parsedRef = GadgetRefSchema.safeParse({
    gadgetType: parsedRow.data.gadget_type,
    gadgetId: parsedRow.data.gadget_id,
    subId: parsedRow.data.sub_id,
  });
  if (!parsedRef.success) {
    return undefined;
  }
  return {
    ref: parsedRef.data,
    label: parsedRow.data.label,
    subLabel: parsedRow.data.sub_label ?? undefined,
    hasLimitedAudience: parsedRow.data.has_limited_audience,
  };
}

/**
 * Searches the workspace's gadgets the current user can read, most relevant
 * first. Use it to suggest gadgets to reference, for example while typing
 * after `@` in a comment. Rows that do not form a valid ref are dropped
 * rather than shown.
 */
export async function searchGadgets(params: {
  workspaceId: string;
  query: string;
  limit: number;
}): Promise<GadgetSearchResult[]> {
  const { data, error } = await AvaSupabase.db().rpc("rpc_gadgets__search", {
    p_workspace_id: params.workspaceId,
    p_query: params.query,
    p_limit: params.limit,
  });
  if (error) {
    throw new Error(`Gadget search failed: ${error.message}`);
  }
  return (data ?? []).flatMap((row) => {
    const result = _rowToResult(row);
    return result === undefined ? [] : [result];
  });
}

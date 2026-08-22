import type { UnknownModule } from "@avandar/modules";
import type { RegisteredSupabaseDatabase } from "@clients/Register.types.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

import { withNewMembers } from "@avandar/modules";

export type WithSupabaseClient<M extends UnknownModule = UnknownModule> = M & {
  getDb: () => SupabaseClient<RegisteredSupabaseDatabase>;
};

export function withSupabaseClient<
  TSupabaseClient extends SupabaseClient<RegisteredSupabaseDatabase>,
>(
  supabaseClient: TSupabaseClient,
): () => { members: { getDb: () => TSupabaseClient } } {
  return withNewMembers({
    getDb: () => {
      return supabaseClient;
    },
  });
}

import { withNewMembers } from "@modules/mixins/withNewMembers/withNewMembers.ts";
import type { RegisteredSupabaseDatabase } from "@clients/Register.types.ts";
import type { UnknownModule } from "@modules/createModule.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

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

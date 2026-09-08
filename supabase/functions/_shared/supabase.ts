import { createClient } from "@supabase/supabase-js";
import type { Database } from "$/types/database.types.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

export const SupabaseAdmin = createClient<Database>(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SB_SECRET_KEY")!,
);

export type AvaSupabaseClient = SupabaseClient<Database>;

export function createSupabaseClient(request: Request): AvaSupabaseClient {
  return createClient<Database>(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SB_PUBLISHABLE_KEY")!,
    {
      global: {
        headers: {
          Authorization: request.headers.get("Authorization")!,
        },
      },
    },
  );
}

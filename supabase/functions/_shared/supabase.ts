import { createClient } from "npm:@supabase/supabase-js@2";
import type { Database } from "../../../src/types/database.types.ts";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export const SupabaseAdmin = createClient<Database>(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

export type AvaSupabaseClient = SupabaseClient<Database>;

export function createSupabaseClient(request: Request): AvaSupabaseClient {
  return createClient<Database>(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: {
        headers: {
          Authorization: request.headers.get("Authorization")!,
        },
      },
    },
  );
}

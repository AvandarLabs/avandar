import { Database } from "@/types/database.types";
import { BaseClient } from "./BaseClient";
import type { SupabaseClient } from "@supabase/supabase-js";

export type WithSupabaseClient<Client extends BaseClient> = Client & {
  setDBClient: (newDBClient: SupabaseClient<Database>) => Client;
};

export function withSupabaseClient<C extends BaseClient>(
  client: C,
  initializer: (newDBClient: SupabaseClient<Database>) => C,
): WithSupabaseClient<C> {
  return {
    ...client,
    setDBClient: (newDBClient: SupabaseClient<Database>): C => {
      return initializer(newDBClient);
    },
  };
}

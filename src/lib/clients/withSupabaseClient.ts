import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";
import { BaseClient } from "./BaseClient";

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

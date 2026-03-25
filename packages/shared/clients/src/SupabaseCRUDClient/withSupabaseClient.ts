import type { RegisteredSupabaseDatabase } from "@clients/Register.types.ts";
import type { ServiceClient } from "@clients/ServiceClient/ServiceClient.types.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

export type WithSupabaseClient<Client extends ServiceClient> = Client & {
  setDBClient: (
    newDBClient: SupabaseClient<RegisteredSupabaseDatabase>,
  ) => Client;
};

export function withSupabaseClient<Client extends ServiceClient>(
  client: Client,
  initializer: (
    newDBClient: SupabaseClient<RegisteredSupabaseDatabase>,
  ) => Client,
): WithSupabaseClient<Client> {
  return {
    ...client,
    setDBClient: (
      newDBClient: SupabaseClient<RegisteredSupabaseDatabase>,
    ): Client => {
      return initializer(newDBClient);
    },
  };
}

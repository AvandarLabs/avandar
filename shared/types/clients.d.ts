import type { Database } from "./database.types.ts";

declare module "@avandar/clients" {
  interface Register {
    supabaseDatabase: Database;
  }
}

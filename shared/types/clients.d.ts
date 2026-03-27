import type { Database } from "$/types/database.types.ts";

declare module "@clients/Register.types.ts" {
  interface Register {
    supabaseDatabase: Database;
  }
}

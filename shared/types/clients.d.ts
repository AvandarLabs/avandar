import type { Database } from "./database.types.ts";

declare module "@clients/Register.types.ts" {
  interface Register {
    supabaseDatabase: Database;
  }
}

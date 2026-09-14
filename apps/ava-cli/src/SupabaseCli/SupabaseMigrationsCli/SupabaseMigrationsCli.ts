import { SupabaseMigrationsValidateCli } from "@ava-cli/SupabaseCli/SupabaseMigrationsCli/SupabaseMigrationsValidateCli/SupabaseMigrationsValidateCli";
import { Acclimate } from "@avandar/acclimate";

/** A CLI for inspecting Avandar's Supabase migration files. */
export const SupabaseMigrationsCli = Acclimate.createCLI("migrations")
  .description("Inspect and validate Supabase migration files")
  .addCommand("validate", SupabaseMigrationsValidateCli);

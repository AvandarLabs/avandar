import { SupabaseMigrationsValidateCLI } from "@ava-cli/SupabaseCLI/SupabaseMigrationsCLI/SupabaseMigrationsValidateCLI/SupabaseMigrationsValidateCLI";
import { Acclimate } from "@avandar/acclimate";

/** A CLI for inspecting Avandar's Supabase migration files. */
export const SupabaseMigrationsCLI = Acclimate.createCLI("migrations")
  .description("Inspect and validate Supabase migration files")
  .addCommand("validate", SupabaseMigrationsValidateCLI);

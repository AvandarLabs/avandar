import { Acclimate } from "@avandar/acclimate";
import { NewSupabaseTableCLI } from "./NewSupabaseTableCLI";
import { NewTSModelCLI } from "./NewTSModelCLI";

/**
 * A CLI for creating new code boilerplates, such as new TypeScript models
 * or new Supabase table schemas.
 */
export const NewBoilerplateCLI = Acclimate.createCLI("new")
  .addCommand("model", NewTSModelCLI)
  .addCommand("table", NewSupabaseTableCLI);

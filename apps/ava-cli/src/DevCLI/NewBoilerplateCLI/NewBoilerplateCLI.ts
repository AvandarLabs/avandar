import { Acclimate } from "@avandar/acclimate";
import { NewPackageCLI } from "./NewPackageCLI/NewPackageCLI";
import { NewSupabaseTableCLI } from "./NewSupabaseTableCLI/NewSupabaseTableCLI";
import { NewTSModelCLI } from "./NewTSModelCLI/NewTSModelCLI";

/**
 * A CLI for creating new code boilerplates, such as new TypeScript models
 * or new Supabase table schemas.
 */
export const NewBoilerplateCLI = Acclimate.createCLI("new")
  .addCommand("model", NewTSModelCLI)
  .addCommand("package", NewPackageCLI)
  .addCommand("table", NewSupabaseTableCLI);

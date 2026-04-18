import { NewEdgeFunctionCLI } from "@ava-cli/DevCLI/NewBoilerplateCLI/NewEdgeFunctionCLI/NewEdgeFunctionCLI";
import { NewPackageCLI } from "@ava-cli/DevCLI/NewBoilerplateCLI/NewPackageCLI/NewPackageCLI";
import { NewSupabaseTableCLI } from "@ava-cli/DevCLI/NewBoilerplateCLI/NewSupabaseTableCLI/NewSupabaseTableCLI";
import { NewTSModelCLI } from "@ava-cli/DevCLI/NewBoilerplateCLI/NewTSModelCLI/NewTSModelCLI";
import { Acclimate } from "@avandar/acclimate";

/**
 * A CLI for creating new code boilerplates, such as new TypeScript models
 * or new Supabase table schemas.
 */
export const NewBoilerplateCLI = Acclimate.createCLI("new")
  .addCommand("model", NewTSModelCLI)
  .addCommand("package", NewPackageCLI)
  .addCommand("table", NewSupabaseTableCLI)
  .addCommand("edge", NewEdgeFunctionCLI);

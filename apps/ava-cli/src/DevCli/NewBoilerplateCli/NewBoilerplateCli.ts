import { NewEdgeFunctionCli } from "@ava-cli/DevCli/NewBoilerplateCli/NewEdgeFunctionCli/NewEdgeFunctionCli";
import { NewPackageCli } from "@ava-cli/DevCli/NewBoilerplateCli/NewPackageCli/NewPackageCli";
import { NewSupabaseTableCli } from "@ava-cli/DevCli/NewBoilerplateCli/NewSupabaseTableCli/NewSupabaseTableCli";
import { NewTSModelCli } from "@ava-cli/DevCli/NewBoilerplateCli/NewTSModelCli/NewTSModelCli";
import { Acclimate } from "@avandar/acclimate";

/**
 * A CLI for creating new code boilerplates, such as new TypeScript models
 * or new Supabase table schemas.
 */
export const NewBoilerplateCli = Acclimate.createCLI("new")
  .addCommand("model", NewTSModelCli)
  .addCommand("package", NewPackageCli)
  .addCommand("table", NewSupabaseTableCli)
  .addCommand("edge", NewEdgeFunctionCli);

import { NewAvaModelCli } from "@ava-cli/DevCli/NewBoilerplateCli/NewAvaModelCli/NewAvaModelCli";
import { NewEdgeFunctionCli } from "@ava-cli/DevCli/NewBoilerplateCli/NewEdgeFunctionCli/NewEdgeFunctionCli";
import { NewPackageCli } from "@ava-cli/DevCli/NewBoilerplateCli/NewPackageCli/NewPackageCli";
import { NewSupabaseTableCli } from "@ava-cli/DevCli/NewBoilerplateCli/NewSupabaseTableCli/NewSupabaseTableCli";
import { Acclimate } from "@avandar/acclimate";

/**
 * A CLI for creating new code boilerplates, such as new TypeScript models
 * or new Supabase table schemas.
 */
export const NewBoilerplateCli = Acclimate.createCLI("new")
  .addCommand("model", NewAvaModelCli)
  .addCommand("package", NewPackageCli)
  .addCommand("table", NewSupabaseTableCli)
  .addCommand("edge", NewEdgeFunctionCli);

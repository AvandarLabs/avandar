import { DevCLI } from "@ava-cli/DevCLI/DevCLI";
import { loadDevEnv } from "@ava-cli/loadDevEnv";
import { PipelineCLI } from "@ava-cli/PipelineCLI/PipelineCLI";
import { PolarCLI } from "@ava-cli/PolarCLI/PolarCLI";
import { SupabaseCLI } from "@ava-cli/SupabaseCLI/SupabaseCLI";
import { Acclimate } from "@avandar/acclimate";

const cli = Acclimate.createCLI("ava")
  .addCommand("dev", DevCLI)
  .addCommand("pipeline", PipelineCLI)
  .addCommand("polar", PolarCLI)
  .addCommand("supabase", SupabaseCLI);

loadDevEnv();
Acclimate.run(cli);

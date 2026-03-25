import { Acclimate } from "@avandar/acclimate";
import { DevCLI } from "./DevCLI/DevCLI";
import { loadDevEnv } from "./loadDevEnv";
import { PipelineCLI } from "./PipelineCLI/PipelineCLI";
import { PolarCLI } from "./PolarCLI/PolarCLI";
import { SupabaseCLI } from "./SupabaseCLI/SupabaseCLI";

const cli = Acclimate.createCLI("ava")
  .addCommand("dev", DevCLI)
  .addCommand("pipeline", PipelineCLI)
  .addCommand("polar", PolarCLI)
  .addCommand("supabase", SupabaseCLI);

loadDevEnv();
Acclimate.run(cli);

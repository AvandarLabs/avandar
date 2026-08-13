import { DevCLI } from "@ava-cli/DevCLI/DevCLI";
import { NewBoilerplateCLI } from "@ava-cli/DevCLI/NewBoilerplateCLI/NewBoilerplateCLI";
import { loadDevEnv } from "@ava-cli/loadDevEnv";
import { PipelineCLI } from "@ava-cli/PipelineCLI/PipelineCLI";
import { PolarCLI } from "@ava-cli/PolarCLI/PolarCLI";
import { ReleaseCLI } from "@ava-cli/ReleaseCLI/ReleaseCLI";
import { SupabaseCLI } from "@ava-cli/SupabaseCLI/SupabaseCLI";
import { assertCLIIsUpToDate } from "@ava-cli/utils/assertCLIIsUpToDate/assertCLIIsUpToDate";
import { Acclimate } from "@avandar/acclimate";

const cli = Acclimate.createCLI("ava")
  .addCommand("dev", DevCLI)
  .addCommand("new", NewBoilerplateCLI)
  .addCommand("pipeline", PipelineCLI)
  .addCommand("polar", PolarCLI)
  .addCommand("release", ReleaseCLI)
  .addCommand("supabase", SupabaseCLI);

// Nothing rebuilds `ava` automatically, so refuse to run stale code against the
// repository. Acclimate has no pre-command hook, so this guards the entry
// point.
if (!assertCLIIsUpToDate()) {
  process.exit(1);
}

loadDevEnv();
Acclimate.run(cli);

import { Acclimate } from "@avandar/acclimate";
import * as dotenv from "dotenv";
import { DevCLI } from "./DevCLI";
import { PolarCLI } from "./PolarCLI";
import { SupabaseCLI } from "./SupabaseCLI/SupabaseCLI";

type DotenvConfigResult = Readonly<{
  error?: unknown;
}>;

function _loadDevEnv(): void {
  const result = dotenv.config({
    path: ".env.development",
    quiet: true,
  }) as DotenvConfigResult;

  if (result.error !== undefined) {
    throw new Error(
      "Failed to load .env.development. Run this command from the repo root " +
        "so we can load the environment variables.",
    );
  }
}

const cli = Acclimate.createCLI("ava")
  .addCommand("dev", DevCLI)
  .addCommand("polar", PolarCLI)
  .addCommand("supabase", SupabaseCLI);

_loadDevEnv();
Acclimate.run(cli);

import * as path from "node:path";
import { Acclimate } from "@avandar/acclimate";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { register } from "tsconfig-paths";

const PROJECT_ROOT = path.join(process.cwd());

type DotenvConfigResult = Readonly<{
  error?: unknown;
}>;

console.log(PROJECT_ROOT);
register({
  baseUrl: PROJECT_ROOT,
  paths: {
    "@/*": ["./src/*"],
    "$/*": ["./shared/*"],
    "~/*": ["./*"],
  },
});

function loadProductionEnv(): void {
  const result = dotenv.config({
    path: ".env.production",
    quiet: true,
  }) as DotenvConfigResult;

  if (result.error !== undefined) {
    throw new Error(
      "Failed to load .env.production. Run this command from the repo root " +
        "so we can load the environment variables.",
    );
  }
}

function loadStagingEnv(): void {
  const result = dotenv.config({
    path: ".env.staging",
    quiet: true,
  }) as DotenvConfigResult;

  if (result.error !== undefined) {
    throw new Error(
      "Failed to load .env.staging. Run this command from the repo root " +
        "so we can load the environment variables.",
    );
  }
}

/** A CLI for running an abitrary .ts file with a Supabase Admin Client */
export const SupabaseRunCLI = Acclimate.createCLI("run")
  .description("Run an arbitrary .ts function with a Supabase Admin Client")
  .addPositionalArg({
    name: "filePath",
    description: "The path to the .ts file to run",
    required: true,
    type: "string",
  })
  .addOption({
    name: "--prod",
    description:
      "Use .env.production to run this script. We use .env.development by default.",
    required: false,
    default: false,
    type: "boolean",
  })
  .addOption({
    name: "--staging",
    description:
      "Use .env.staging to run this script. We use .env.development by default. ",
    default: false,
    required: false,
    type: "boolean",
  })
  .action(async ({ filePath, prod, staging }) => {
    if (prod) {
      Acclimate.log("|yellow|Loading production environment...");
      loadProductionEnv();
    }

    if (staging) {
      Acclimate.log("|yellow|Loading staging environment...");
      loadStagingEnv();
    }

    Acclimate.log("|yellow|Running file: $filePath$", { filePath });
    const supabaseAdminClient = createClient(
      process.env.VITE_SUPABASE_API_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const result = await import(path.join(PROJECT_ROOT, filePath));
    const functionToRun = result.default;
    await functionToRun({ supabaseAdminClient });
  });

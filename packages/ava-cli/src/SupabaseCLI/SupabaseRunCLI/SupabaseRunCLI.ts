import { spawn } from "node:child_process";
import * as path from "node:path";
import { Acclimate } from "@avandar/acclimate";
import * as dotenv from "dotenv";
import { getSupabaseScriptsList } from "./getSupabaseScriptsList";

const PROJECT_ROOT = path.join(process.cwd());

const SUPABASE_SCRIPT_RUNNER_PATH = path.join(
  PROJECT_ROOT,
  "packages",
  "ava-cli",
  "src",
  "SupabaseCLI",
  "SupabaseRunCLI",
  "supabase-script-runner",
  "main.ts",
);

type DotenvConfigResult = Readonly<{
  error?: unknown;
}>;

function _loadProductionEnv(): void {
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

function _loadStagingEnv(): void {
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

async function _printScriptsList(): Promise<void> {
  Acclimate.log("\n|white|The following scripts are available:");
  const scriptsList = await getSupabaseScriptsList();
  const scriptsListString = scriptsList
    .map((script: string) => {
      return `- ${script}`;
    })
    .join("\n");

  Acclimate.log(scriptsListString);
}

async function _printUsage(): Promise<void> {
  Acclimate.log(
    "|yellow|Usage:\n\tava supabase run --script <script-name> --query <sql>",
  );
  Acclimate.log(
    "\n\t|yellow|The script file should export a `RowSchema` (z.object) and a `function execute({ rows })`.",
  );
  Acclimate.log(
    "\n\t|yellow|The SQL query results will get passed into the specified script's `execute` function.",
  );
  await _printScriptsList();
}

/** A CLI for running an abitrary .ts file with a Supabase Admin Client */
export const SupabaseRunCLI = Acclimate.createCLI("run")
  .description("Run an arbitrary .ts function with a Supabase Admin Client")
  .addOption({
    name: "--script",
    aliases: ["-s"],
    description: "The script file name to run",
    required: false,
    type: "string",
  })
  .addOption({
    name: "--list-scripts",
    aliases: ["-l"],
    description: "The name of the script to run",
    required: false,
    type: "boolean",
  })
  .addOption({
    name: "--sql",
    aliases: ["-q"],
    description: "The SQL query to run",
    required: false,
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
  .action(async ({ script, sql, prod, staging, listScripts }) => {
    if (listScripts) {
      await _printScriptsList();
      return;
    }

    if (!script) {
      await _printUsage();
      Acclimate.log("|red|ERROR: No script name provided.");
      return;
    }

    if (!sql) {
      await _printUsage();
      Acclimate.log("|red|ERROR: No SQL was provided.");
      return;
    }

    // set up the environment
    if (staging) {
      Acclimate.log("|yellow|Loading staging environment...");
      _loadStagingEnv();
    } else if (prod) {
      Acclimate.log("|yellow|Loading production environment...");
      _loadProductionEnv();
    }

    // find the requested script module
    const validScripts = await getSupabaseScriptsList();
    const scriptToRun = validScripts.find((s: string) => {
      return s === script;
    });
    if (!scriptToRun) {
      Acclimate.log(
        "|red|ERROR: Script '$script$' not found in .ava/scripts directory.",
        { script },
      );
      return _printScriptsList();
    }

    Acclimate.log("|yellow|Running script: $scriptName$", {
      scriptName: scriptToRun,
    });

    const dbLocation =
      staging ? "staging"
      : prod ? "production"
      : "local";

    const scriptFilePath = path.join(
      PROJECT_ROOT,
      ".ava",
      "scripts",
      `${scriptToRun}.ts`,
    );

    // we spawn a child process to execute the supabase script runner so that
    // we can use `tsx` to load the `tsconfig.node.json` file. That way
    // the user-supplied script module can run with the correct TypeScript
    // compiler options.
    const child = spawn(
      "npx",
      [
        "tsx",
        "--tsconfig",
        path.join(PROJECT_ROOT, "tsconfig.node.json"),
        SUPABASE_SCRIPT_RUNNER_PATH,
        "--dbLocationType",
        dbLocation,
        "--sql",
        sql,
        "--absolutePathToScript",
        scriptFilePath,
      ],
      {
        cwd: PROJECT_ROOT,
        stdio: "inherit",
        // pass through the env we loaded
        env: { ...process.env },
      },
    );

    await new Promise<void>((resolve, reject) => {
      child.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Process exited with ${code}`));
        }
      });
    });
  });

/**
 * CLI argument parsing, help text, and env loading for the LLM translation
 * script. These pure functions do not touch the network, so they can be
 * tested directly.
 */

import path from "node:path";
import dotenv from "dotenv";
import { PROJECT_ROOT } from "./config";

export type CliOptions = {
  help: boolean;
  all: boolean;
  dryRun: boolean;
  scopes: string[];
  locales: string[];
  model: string | undefined;
};

export type ParseArgsResult =
  | { ok: true; options: CliOptions }
  | { ok: false; error: string };

/**
 * Returns the human-readable help text for the CLI. Exported so tests
 * can assert on it without invoking the script.
 */
function _buildHelpText(): string {
  return [
    "Usage: pnpm vite-script scripts/i18n/translateWithLlm/translateWithLlm.ts [options]",
    "",
    "Translate missing Lingui catalog entries into one or more locales using",
    "the OpenAI Chat Completions API. Reads .po files from src/i18n/locales/,",
    "fills empty msgstr entries, and writes the updated catalogs back.",
    "",
    "Required env (loaded automatically from .env.development; falls back to",
    ".env.development.edge for compatibility with the Supabase edge convention):",
    "  OPENAI_API_KEY    Your OpenAI API key.",
    "",
    "Optional env:",
    "  I18N_LLM_MODEL    OpenAI model to use. Defaults to gpt-4o-mini.",
    "",
    "Options:",
    "  -h, --help              Show this help and exit.",
    "      --all               Translate every empty msgstr in every non-source",
    "                          locale. Cannot be combined with --scope or",
    "                          --locale.",
    "      --scope <pattern>   Only translate entries whose #: source-file",
    "                          reference contains <pattern>. Repeatable, and",
    "                          can also be a comma-separated list. Examples:",
    "                            --scope WorkspaceSettingsPage",
    "                            --scope src/views/Settings,src/components/Foo",
    "      --locale <code>     Target locale (e.g. es, pt, fr, sw, ar,",
    "                          zh-Hans, zh-Hant). Repeatable, and can also be",
    "                          a comma-separated list. Defaults to every",
    "                          non-source locale when omitted with --all.",
    "      --model <name>      Override the OpenAI model. Same as setting",
    "                          I18N_LLM_MODEL.",
    "      --dry-run           Translate but don't write changes to disk.",
    "",
    "Examples:",
    "  # Translate ONLY the Workspace Settings page, ONLY into Spanish.",
    "  pnpm vite-script scripts/i18n/translateWithLlm/translateWithLlm.ts \\",
    "      --scope WorkspaceSettingsPage --locale es",
    "",
    "  # Translate every empty msgstr in every locale (full run).",
    "  pnpm vite-script scripts/i18n/translateWithLlm/translateWithLlm.ts --all",
    "",
    "  # Dry-run Spanish translations for two scopes without writing.",
    "  pnpm vite-script scripts/i18n/translateWithLlm/translateWithLlm.ts \\",
    "      --scope WorkspaceSettingsPage --scope src/views/Dashboard \\",
    "      --locale es --dry-run",
    "",
  ].join("\n");
}

/**
 * Parse the script's CLI arguments. This pure function does not read env or
 * touch the filesystem, so it can be tested directly.
 *
 * @param argv The argv slice (i.e. without `node` / script path). Pass
 *   `process.argv.slice(2)` from the entrypoint.
 */
function _parseArgs(argv: string[]): ParseArgsResult {
  const options: CliOptions = {
    help: false,
    all: false,
    dryRun: false,
    scopes: [],
    locales: [],
    model: undefined,
  };

  const splitList = (value: string): string[] => {
    return value
      .split(",")
      .map((listValue) => {
        return listValue.trim();
      })
      .filter((listValue) => {
        return listValue.length > 0;
      });
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "-h" || arg === "--help") {
      options.help = true;
    } else if (arg === "--all") {
      options.all = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--scope") {
      const optionValue = argv[i + 1];
      if (optionValue === undefined || optionValue.startsWith("-")) {
        return { ok: false, error: "--scope requires a value" };
      }
      options.scopes.push(...splitList(optionValue));
      i++;
    } else if (arg.startsWith("--scope=")) {
      options.scopes.push(...splitList(arg.slice("--scope=".length)));
    } else if (arg === "--locale") {
      const optionValue = argv[i + 1];
      if (optionValue === undefined || optionValue.startsWith("-")) {
        return { ok: false, error: "--locale requires a value" };
      }
      options.locales.push(...splitList(optionValue));
      i++;
    } else if (arg.startsWith("--locale=")) {
      options.locales.push(...splitList(arg.slice("--locale=".length)));
    } else if (arg === "--model") {
      const optionValue = argv[i + 1];
      if (optionValue === undefined || optionValue.startsWith("-")) {
        return { ok: false, error: "--model requires a value" };
      }
      options.model = optionValue;
      i++;
    } else if (arg.startsWith("--model=")) {
      options.model = arg.slice("--model=".length);
    } else {
      return { ok: false, error: `Unknown argument: ${arg}` };
    }
  }

  if (
    options.all &&
    (options.scopes.length > 0 || options.locales.length > 0)
  ) {
    return {
      ok: false,
      error: "--all cannot be combined with --scope or --locale",
    };
  }

  return { ok: true, options };
}

/**
 * Load env vars from .env.development and .env.development.edge (the
 * latter holds the OpenAI key in our Supabase edge-function convention).
 * Already-set vars on `process.env` win over file values so callers can
 * still override on the command line.
 */
function _loadEnvFiles(): void {
  [".env.development", ".env.development.edge"].forEach((file) => {
    dotenv.config({ path: path.join(PROJECT_ROOT, file), override: false });
  });
}

/** Parses translation CLI options and builds its help output. */
export const TranslationCli = {
  parseArgs: _parseArgs,
  buildHelpText: _buildHelpText,
  loadEnvFiles: _loadEnvFiles,
};

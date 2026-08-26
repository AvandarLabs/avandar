import {
  printError,
  printInfo,
  printSuccess,
  printWarn,
} from "@ava-cli/utils/cliOutput/cliOutput";
import { Acclimate } from "@avandar/acclimate";
import * as dotenv from "dotenv";

/** Which deployment's `tokens__google` to read. */
type SupabaseTarget = "local" | "staging" | "production";

const ENV_FILE_FROM_TARGET = {
  local: ".env.development",
  staging: ".env.staging",
  production: ".env.production",
} as const satisfies Record<SupabaseTarget, string>;

/**
 * The Sensitive scope the app stopped requesting.
 *
 * A refresh token issued before it was dropped still carries it, which is read
 * and write on every spreadsheet in the account, so a token about to be pasted
 * into a file is worth flagging.
 */
const WIDE_SPREADSHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

type GoogleTokenRow = Readonly<{
  refresh_token: string;
  google_email: string;
  scope: string;
  expiry_date: string;
  updated_at: string;
}>;

/** Reads the target from the mutually exclusive environment flags. */
function _getTarget(
  options: Readonly<{ staging: boolean; prod: boolean }>,
): SupabaseTarget {
  if (options.staging && options.prod) {
    throw new Error("Pass at most one of --staging and --prod.");
  }
  if (options.staging) {
    return "staging";
  }
  if (options.prod) {
    return "production";
  }
  return "local";
}

/**
 * Loads the target's env file over whatever `loadDevEnv` already put in place.
 *
 * `override: true` is required, not stylistic. The CLI entry point loads
 * `.env.development` before any command runs, and dotenv leaves an existing
 * `process.env` value alone by default, so a plain `dotenv.config` here would
 * be silently ignored for every variable the two files share and this command
 * would read the local database while reporting that it read production.
 *
 * `local` loads nothing, because the entry point already loaded exactly this
 * file.
 */
function _loadEnvForTarget(target: SupabaseTarget): void {
  if (target === "local") {
    return;
  }
  const path = ENV_FILE_FROM_TARGET[target];
  const result = dotenv.config({ path, override: true, quiet: true }) as {
    error?: unknown;
  };
  if (result.error !== undefined) {
    throw new Error(
      `Failed to load ${path}. Run this command from the repo root.`,
    );
  }
}

/**
 * The REST endpoint and secret key for the loaded environment.
 *
 * Deliberately reads only `VITE_SUPABASE_API_URL`, with no fallback to
 * `SUPABASE_URL`. Both name the same thing, but only the former is present in
 * all three env files, and a fallback would quietly resolve to the *local*
 * `SUPABASE_URL` left behind by the entry point whenever a remote target's file
 * omits it. Reading a local database under a `--prod` banner is the one outcome
 * worth engineering against here.
 */
function _getRestConfig(
  target: SupabaseTarget,
): Readonly<{ apiUrl: string; secretKey: string }> {
  const apiUrl = process.env.VITE_SUPABASE_API_URL;
  const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const path = ENV_FILE_FROM_TARGET[target];

  if (!apiUrl) {
    throw new Error(`VITE_SUPABASE_API_URL is not set in ${path}.`);
  }
  if (!secretKey) {
    throw new Error(`SUPABASE_SERVICE_ROLE_KEY is not set in ${path}.`);
  }
  return { apiUrl: apiUrl.replace(/\/+$/, ""), secretKey };
}

/**
 * Reads every `tokens__google` row for one Google address, newest first.
 *
 * `google_email` is not unique: the unique constraints are on
 * `google_account_id` and on `(user_id, google_account_id)`, so the same Google
 * account connected by two Avandar users is two rows. All of them are fetched
 * so the caller can say so rather than silently picking one.
 */
async function _fetchTokenRows(
  options: Readonly<{ apiUrl: string; secretKey: string; email: string }>,
): Promise<readonly GoogleTokenRow[]> {
  const { apiUrl, secretKey, email } = options;
  const query = new URLSearchParams({
    select: "refresh_token,google_email,scope,expiry_date,updated_at",
    google_email: `eq.${email}`,
    order: "updated_at.desc",
  });
  const response = await fetch(`${apiUrl}/rest/v1/tokens__google?${query}`, {
    headers: {
      apikey: secretKey,
      Authorization: `Bearer ${secretKey}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Supabase answered ${response.status} reading tokens__google: ${body}`,
    );
  }
  return (await response.json()) as readonly GoogleTokenRow[];
}

/**
 * Print the stored Google refresh token for one connected account.
 *
 * This is separated from the CLI wiring so it can be unit-tested.
 */
export async function runGoogleTokenGet(
  options: Readonly<{
    email: string;
    staging: boolean;
    prod: boolean;
    raw: boolean;
  }>,
): Promise<void> {
  const { email, raw } = options;
  const target = _getTarget(options);

  // Only the lookup is wrapped. A missing row is an ordinary outcome with its
  // own guidance, not a failure to report twice, so it is handled after this.
  let rows: readonly GoogleTokenRow[];
  try {
    _loadEnvForTarget(target);
    const { apiUrl, secretKey } = _getRestConfig(target);

    if (!raw) {
      printInfo(`Reading tokens__google from ${target} (${apiUrl})...`);
    }
    rows = await _fetchTokenRows({ apiUrl, secretKey, email });
  } catch (error: unknown) {
    const message: string =
      error instanceof Error ? error.message : String(error);
    printError("Failed to read the Google refresh token.");
    printError(message);
    throw error;
  }

  const [newest] = rows;
  if (!newest) {
    printError(`No Google account connected for ${email} on ${target}.`);
    printError(
      "Connect it in the app first: Data Manager > Data Import > " +
        "Connectors > Connect to Google Sheets.",
    );
    // Thrown so the exit code is non-zero, which is what makes a `--raw`
    // capture in a shell script fail instead of assigning an empty string.
    throw new Error(`No tokens__google row for ${email} on ${target}.`);
  }

  // Raw mode is for `$(...)` capture, so the token is the only thing on
  // stdout. Everything else would end up inside the variable.
  if (raw) {
    Acclimate.log(newest.refresh_token);
    return;
  }

  if (rows.length > 1) {
    printWarn(
      `${rows.length} rows match ${email}, one per Avandar user that ` +
        "connected it. Showing the most recently updated.",
    );
  }

  printInfo(`Google account: ${newest.google_email}`);
  printInfo(`Scope:          ${newest.scope}`);
  printInfo(`Row updated:    ${newest.updated_at}`);
  // Named explicitly because it is the *access* token's expiry. The refresh
  // token has no stored expiry, and confusing the two is the whole reason this
  // command exists.
  printInfo(`Access token expires: ${newest.expiry_date}`);

  if (newest.scope.includes(WIDE_SPREADSHEETS_SCOPE)) {
    printWarn(
      "This token still carries the Sensitive auth/spreadsheets scope " +
        "(read and write on every spreadsheet in the account). It predates " +
        "that scope being dropped. Revoke Avandar at " +
        "myaccount.google.com/permissions, delete this row, and reconnect to " +
        "get a drive.file-only token.",
    );
  }

  printSuccess("Refresh token:");
  Acclimate.log(newest.refresh_token);
}

/** Print the stored Google refresh token for one connected account. */
export const GoogleTokenGetCLI = Acclimate.createCLI("get")
  .description(
    "Print the stored Google refresh token for a connected Google account.",
  )
  .addPositionalArg({
    name: "email",
    required: true,
    description:
      "The Google address the account was connected as, matched against " +
      "tokens__google.google_email.",
    type: "string",
    validator: (value: string) => {
      return value.includes("@") || "Pass the Google account's email address.";
    },
  })
  .addOption({
    name: "--prod",
    description:
      "Read from .env.production. We use .env.development by default.",
    required: false,
    default: false,
    type: "boolean",
  })
  .addOption({
    name: "--staging",
    description: "Read from .env.staging. We use .env.development by default.",
    required: false,
    default: false,
    type: "boolean",
  })
  .addOption({
    name: "--raw",
    description:
      "Print only the refresh token, so it can be captured in a shell " +
      "variable.",
    required: false,
    default: false,
    type: "boolean",
  })
  .action(
    (
      commandArguments: Readonly<{
        email: string;
        staging: boolean;
        prod: boolean;
        raw: boolean;
      }>,
    ) => {
      return runGoogleTokenGet(commandArguments);
    },
  );

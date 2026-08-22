import type {
  SupabaseConfigState,
  SupabaseLocalStatus,
} from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types";

import { EnvFileLine } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/EnvFileLine/EnvFileLine";

const PROJECT_ID_PATTERN = /^(\s*project_id\s*=\s*)"([^"]+)"(\s*(?:#.*)?)$/;
const SECTION_PATTERN = /^\s*\[([^\]]+)\]\s*(?:#.*)?$/;
const PORT_PATTERN =
  /^(\s*)(port|[A-Za-z0-9_-]+_port)(\s*=\s*)(\d+)(\s*(?:#.*)?)$/;

/**
 * Where each development variable gets its value.
 *
 * `VITE_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` keep their historic
 * names but hold the publishable and secret keys, which is what
 * `scripts/ci/prepare-envs` writes and what the local stack now issues. Writing
 * the legacy JWTs into them would leave a switched worktree on a different key
 * format from every other environment.
 */
const ENV_VALUE_FROM_KEY = {
  VITE_SUPABASE_API_URL: "apiUrl",
  VITE_SUPABASE_ANON_KEY: "publishableKey",
  SUPABASE_POSTGRES_URL: "databaseUrl",
  SUPABASE_SERVICE_ROLE_KEY: "secretKey",
  SUPABASE_URL: "apiUrl",
  SB_SECRET_KEY: "secretKey",
  SB_PUBLISHABLE_KEY: "publishableKey",
} as const satisfies Record<string, keyof SupabaseLocalStatus>;

/**
 * Variables holding a full URL served by the local Supabase API.
 *
 * Only the origin moves with a switch: the path identifies the endpoint, so it
 * survives untouched. A value pointing at a remote host is left alone, since a
 * hosted callback URL has nothing to do with the local stack.
 */
const ENV_KEYS_REBASED_ON_API_URL = new Set(["GOOGLE_REDIRECT_URI"]);

function _readRequiredString(
  options: Readonly<{ value: unknown; sourceKey: string }>,
): string {
  const { value, sourceKey } = options;
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Supabase status is missing ${sourceKey}.`);
  }
  return value;
}

function _getStatusKeyFromEnvKey(
  envKey: string,
): keyof SupabaseLocalStatus | undefined {
  return Object.hasOwn(ENV_VALUE_FROM_KEY, envKey)
    ? ENV_VALUE_FROM_KEY[envKey as keyof typeof ENV_VALUE_FROM_KEY]
    : undefined;
}

/** Reads the project identity and active ports from Supabase TOML. */
function _makeStateFromContents(configContents: string): SupabaseConfigState {
  const configState = configContents.split("\n").reduce<{
    section: string;
    projectId?: string;
    ports: Record<string, number>;
  }>(
    (state, line) => {
      const sectionName = line.match(SECTION_PATTERN)?.[1];
      if (sectionName) {
        return { ...state, section: sectionName };
      }
      const projectId = line.match(PROJECT_ID_PATTERN)?.[2];
      if (projectId && state.section === "") {
        return { ...state, projectId };
      }
      const portMatch = line.match(PORT_PATTERN);
      if (
        portMatch &&
        state.section !== "" &&
        !state.section.startsWith("remotes.")
      ) {
        return {
          ...state,
          ports: {
            ...state.ports,
            [`${state.section}.${portMatch[2]}`]: Number(portMatch[4]),
          },
        };
      }
      return state;
    },
    { section: "", ports: {} },
  );

  const apiPort = configState.ports["api.port"];
  if (!configState.projectId || apiPort === undefined) {
    throw new Error(
      "supabase/config.toml must define project_id and api.port.",
    );
  }
  return {
    projectId: configState.projectId,
    apiPort,
    ports: configState.ports,
  };
}

/** Rewrites Supabase TOML with a project id and shifted port assignments. */
function _makeConfigContentsFromBasePort(
  options: Readonly<{
    configContents: string;
    projectId: string;
    basePort: number;
  }>,
): string {
  const { configContents, projectId, basePort } = options;
  const original = _makeStateFromContents(configContents);
  const portDelta = basePort - original.apiPort;
  let section = "";

  return configContents
    .split("\n")
    .map((line) => {
      const sectionMatch = line.match(SECTION_PATTERN);
      if (sectionMatch) {
        const sectionName = sectionMatch[1];
        if (sectionName) {
          section = sectionName;
        }
        return line;
      }
      const projectMatch = line.match(PROJECT_ID_PATTERN);
      if (projectMatch && section === "") {
        return `${projectMatch[1]}"${projectId}"${projectMatch[3]}`;
      }
      const portMatch = line.match(PORT_PATTERN);
      const portKey = portMatch ? `${section}.${portMatch[2]}` : undefined;
      if (!portMatch || !portKey || original.ports[portKey] === undefined) {
        return line;
      }
      const shiftedPort = original.ports[portKey] + portDelta;
      return `${portMatch[1]}${portMatch[2]}${portMatch[3]}${shiftedPort}${portMatch[5]}`;
    })
    .join("\n");
}

/** Parses the credentials emitted by `supabase status -o json`. */
function _makeLocalStatusFromJson(statusJson: string): SupabaseLocalStatus {
  const value = JSON.parse(statusJson) as Record<string, unknown>;
  return {
    apiUrl: _readRequiredString({ value: value.API_URL, sourceKey: "API_URL" }),
    databaseUrl: _readRequiredString({
      value: value.DB_URL,
      sourceKey: "DB_URL",
    }),
    anonKey: _readRequiredString({
      value: value.ANON_KEY,
      sourceKey: "ANON_KEY",
    }),
    serviceRoleKey: _readRequiredString({
      value: value.SERVICE_ROLE_KEY,
      sourceKey: "SERVICE_ROLE_KEY",
    }),
    publishableKey: _readRequiredString({
      value: value.PUBLISHABLE_KEY,
      sourceKey: "PUBLISHABLE_KEY",
    }),
    secretKey: _readRequiredString({
      value: value.SECRET_KEY,
      sourceKey: "SECRET_KEY",
    }),
  };
}

/** Moves a loopback URL onto the local Supabase API origin, path intact. */
function _makeValueRebasedOnApiUrl(
  options: Readonly<{ value: string; apiUrl: string }>,
): string | undefined {
  const { value, apiUrl } = options;
  const url = EnvFileLine.getLoopbackUrl(value);
  const apiOrigin = EnvFileLine.getLoopbackUrl(apiUrl);
  if (
    url === undefined ||
    apiOrigin === undefined ||
    url.port === apiOrigin.port
  ) {
    return undefined;
  }
  const quote = EnvFileLine.getQuote(value);
  url.protocol = apiOrigin.protocol;
  url.host = apiOrigin.host;
  return `${quote}${url.toString()}${quote}`;
}

/** Rewrites known development variables from local Supabase status. */
function _makeDevelopmentEnvFromStatus(
  options: Readonly<{
    envContents: string;
    status: SupabaseLocalStatus;
  }>,
): string {
  const { envContents, status } = options;
  return envContents
    .split("\n")
    .map((line) => {
      const separatorIndex = line.indexOf("=");
      if (separatorIndex < 1) {
        return line;
      }
      const key = line.slice(0, separatorIndex);
      if (key === "SB_JWT_ISSUER") {
        return `${key}=${status.apiUrl}/auth/v1`;
      }
      if (ENV_KEYS_REBASED_ON_API_URL.has(key)) {
        const rebasedValue = _makeValueRebasedOnApiUrl({
          value: line.slice(separatorIndex + 1).trim(),
          apiUrl: status.apiUrl,
        });
        return rebasedValue === undefined ? line : `${key}=${rebasedValue}`;
      }
      const statusKey = _getStatusKeyFromEnvKey(key);
      return statusKey ? `${key}=${status[statusKey]}` : line;
    })
    .join("\n");
}

/** Transforms Supabase configuration and local status values. */
export const SupabaseConfig = {
  /** Reads the project identity and active ports from Supabase TOML. */
  makeStateFromContents: _makeStateFromContents,
  /** Rewrites Supabase TOML with a project id and shifted port assignments. */
  makeConfigContentsFromBasePort: _makeConfigContentsFromBasePort,
  /** Parses the credentials emitted by `supabase status -o json`. */
  makeLocalStatusFromJson: _makeLocalStatusFromJson,
  /** Rewrites known development variables from local Supabase status. */
  makeDevelopmentEnvFromStatus: _makeDevelopmentEnvFromStatus,
};

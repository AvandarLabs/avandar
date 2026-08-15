import type {
  SupabaseConfigState,
  SupabaseLocalStatus,
} from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types";

const PROJECT_ID_PATTERN = /^(\s*project_id\s*=\s*)"([^"]+)"(\s*(?:#.*)?)$/;
const SECTION_PATTERN = /^\s*\[([^\]]+)\]\s*(?:#.*)?$/;
const PORT_PATTERN =
  /^(\s*)(port|[A-Za-z0-9_-]+_port)(\s*=\s*)(\d+)(\s*(?:#.*)?)$/;

const ENV_VALUE_FROM_KEY = {
  VITE_SUPABASE_API_URL: "apiUrl",
  VITE_SUPABASE_ANON_KEY: "anonKey",
  SUPABASE_POSTGRES_URL: "databaseUrl",
  SUPABASE_SERVICE_ROLE_KEY: "serviceRoleKey",
  SUPABASE_URL: "apiUrl",
  SB_SECRET_KEY: "secretKey",
  SB_PUBLISHABLE_KEY: "publishableKey",
} as const satisfies Record<string, keyof SupabaseLocalStatus>;

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
  return Object.hasOwn(ENV_VALUE_FROM_KEY, envKey) ?
      ENV_VALUE_FROM_KEY[envKey as keyof typeof ENV_VALUE_FROM_KEY]
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

import { DevServerPort } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/DevServerPort/DevServerPort";
import { EnvFileLine } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/EnvFileLine/EnvFileLine";
import { SupabaseConfig } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseConfig/SupabaseConfig";
import { SupabaseSwitchState } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseSwitchState/SupabaseSwitchState";
import { prop, propEq } from "@avandar/utils";
import type {
  DevelopmentEnvFile,
  SupabaseEnvironmentDrift,
  SupabaseLocalEnvironmentIo,
  SupabaseLocalStatus,
  SupabaseStatusEntry,
  SupabaseStatusReport,
} from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types";
import type { SupabaseSwitchSources } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseSwitchState/SupabaseSwitchState";

type MakeStatusReportOptions = SupabaseSwitchSources & {
  statusJson: string | undefined;
};

/** Config port keys worth reporting, in the order they are printed. */
const REPORTED_PORT_LABELS = [
  ["api.port", "API"],
  ["db.port", "Database"],
  ["studio.port", "Studio"],
  ["inbucket.port", "Mailpit (email)"],
] as const satisfies ReadonlyArray<readonly [string, string]>;

/** Status keys the codebase browses, in the order they are printed. */
const REPORTED_ENDPOINT_LABELS = [
  ["STUDIO_URL", "Studio"],
  ["MAILPIT_URL", "Mailpit (email)"],
  ["FUNCTIONS_URL", "Edge functions"],
  ["STORAGE_S3_URL", "Storage (S3)"],
] as const satisfies ReadonlyArray<readonly [string, string]>;

function _makeEnvironmentValues(
  status: Readonly<SupabaseLocalStatus>,
): SupabaseStatusEntry[] {
  return [
    { label: "VITE_SUPABASE_API_URL", value: status.apiUrl },
    { label: "SUPABASE_URL", value: status.apiUrl },
    { label: "SUPABASE_POSTGRES_URL", value: status.databaseUrl },
    { label: "VITE_SUPABASE_ANON_KEY", value: status.publishableKey },
    { label: "SUPABASE_SERVICE_ROLE_KEY", value: status.secretKey },
    { label: "SB_PUBLISHABLE_KEY", value: status.publishableKey },
    { label: "SB_SECRET_KEY", value: status.secretKey },
    { label: "SB_JWT_ISSUER", value: `${status.apiUrl}/auth/v1` },
  ];
}

function _makeEndpoints(statusJson: string): SupabaseStatusEntry[] {
  const statusValues = JSON.parse(statusJson) as Record<string, unknown>;
  return REPORTED_ENDPOINT_LABELS.flatMap(([statusKey, label]) => {
    const url = statusValues[statusKey];
    return typeof url === "string" && url !== "" ? [{ label, value: url }] : [];
  });
}

function _makePorts(
  options: Readonly<{ ports: Record<string, number>; devServerPort: number }>,
): SupabaseStatusEntry[] {
  return [
    ...REPORTED_PORT_LABELS.flatMap(([portKey, label]) => {
      const port = options.ports[portKey];
      return port === undefined ? [] : [{ label, value: String(port) }];
    }),
    { label: "Dev server (pnpm dev)", value: String(options.devServerPort) },
  ];
}

/** Returns the keys whose values no longer match the running stack. */
function _makeStaleKeys(
  options: Readonly<{ envContents: string; status: SupabaseLocalStatus }>,
): string[] {
  const expectedLines =
    SupabaseConfig.makeDevelopmentEnvFromStatus(options).split("\n");
  return options.envContents.split("\n").flatMap((line, lineIndex) => {
    const assignment = EnvFileLine.getAssignment(line);
    return assignment !== undefined && line !== expectedLines[lineIndex]
      ? [assignment.key]
      : [];
  });
}

function _makeEnvironmentDrift(
  options: Readonly<{
    envFiles: readonly DevelopmentEnvFile[];
    status: SupabaseLocalStatus;
  }>,
): SupabaseEnvironmentDrift[] {
  return options.envFiles.map(({ filePath, contents }) => {
    return {
      filePath,
      staleKeys: _makeStaleKeys({
        envContents: contents,
        status: options.status,
      }),
    };
  });
}

function _readLocalStatus(
  statusJson: string | undefined,
): SupabaseLocalStatus | undefined {
  if (statusJson === undefined) {
    return undefined;
  }
  try {
    return SupabaseConfig.makeLocalStatusFromJson(statusJson);
  } catch {
    return undefined;
  }
}

/** Development env keys a remote report shows, with secrets cut short. */
const REMOTE_REPORTED_ENV_KEYS = [
  "VITE_SUPABASE_API_URL",
  "SUPABASE_URL",
  "SUPABASE_POSTGRES_URL",
  "VITE_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SB_PUBLISHABLE_KEY",
  "SB_SECRET_KEY",
  "SB_JWT_ISSUER",
] as const;

const SECRET_ENV_KEYS = new Set(["SUPABASE_SERVICE_ROLE_KEY", "SB_SECRET_KEY"]);

/** Visible prefix length of a masked remote secret. */
const MASKED_SECRET_PREFIX_LENGTH = 12;

/**
 * A hosted project's keys are real credentials, unlike the fixed local
 * defaults, so a remote report shows only enough to tell them apart.
 */
function _maskRemoteValue(
  options: Readonly<{ envKey: string; value: string }>,
): string {
  const { envKey, value } = options;
  if (SECRET_ENV_KEYS.has(envKey)) {
    return `${value.slice(0, MASKED_SECRET_PREFIX_LENGTH)}…`;
  }
  return value.replace(/^(postgres(?:ql)?:\/\/[^:/@]+):[^@]*@/, "$1:****@");
}

function _makeRemoteEnvironmentValues(
  envFiles: readonly DevelopmentEnvFile[],
): SupabaseStatusEntry[] {
  const assignments = envFiles.flatMap(({ contents }) => {
    return contents.split("\n").flatMap((line) => {
      const assignment = EnvFileLine.getAssignment(line);
      return assignment === undefined ? [] : [assignment];
    });
  });
  return REMOTE_REPORTED_ENV_KEYS.flatMap((envKey) => {
    const assignment = assignments.find(propEq("key", envKey));
    return assignment === undefined
      ? []
      : [
          {
            label: envKey,
            value: _maskRemoteValue({
              envKey,
              value: EnvFileLine.getUnquotedValue(assignment.value),
            }),
          },
        ];
  });
}

function _makeStatusReport(
  options: Readonly<MakeStatusReportOptions>,
): SupabaseStatusReport {
  const { statusJson, envFiles } = options;
  const { config, ...summary } = SupabaseSwitchState.makeFromSources(options);
  if (summary.switchKind === "remote") {
    return {
      ...summary,
      isSwitched: true,
      isRunning: false,
      ports: [],
      environmentValues: _makeRemoteEnvironmentValues(envFiles),
      endpoints: [],
      environmentDrift: [],
    };
  }
  const status = _readLocalStatus(statusJson);
  return {
    ...summary,
    isSwitched: summary.switchKind === "local",
    isRunning: status !== undefined,
    ports: _makePorts({
      ports: config.ports,
      devServerPort: DevServerPort.fromEnvFiles(envFiles.map(prop("contents"))),
    }),
    environmentValues:
      status === undefined ? [] : _makeEnvironmentValues(status),
    endpoints:
      status === undefined || statusJson === undefined
        ? []
        : _makeEndpoints(statusJson),
    environmentDrift:
      status === undefined ? [] : _makeEnvironmentDrift({ envFiles, status }),
  };
}

async function _readStatusJson(
  io: Readonly<SupabaseLocalEnvironmentIo>,
): Promise<string | undefined> {
  const result = await io.runSupabase(["status", "-o", "json"]);
  return result.ok ? result.stdout : undefined;
}

async function _readStatusReport(
  io: Readonly<SupabaseLocalEnvironmentIo>,
): Promise<SupabaseStatusReport> {
  const [sources, statusJson] = await Promise.all([
    SupabaseSwitchState.readSources(io),
    _readStatusJson(io),
  ]);
  return _makeStatusReport({ ...sources, statusJson });
}

/** Summarizes which local Supabase a worktree is pointed at. */
export const SupabaseStatus = {
  /** Builds the report `ava supabase status` prints. */
  makeStatusReport: _makeStatusReport,

  /** Reads everything `ava supabase status` reports on. */
  readStatusReport: _readStatusReport,
};

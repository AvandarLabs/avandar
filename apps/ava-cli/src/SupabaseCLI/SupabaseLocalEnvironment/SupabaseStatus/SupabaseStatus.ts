import path from "node:path";
import { DevServerPort } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/DevServerPort/DevServerPort";
import { EnvFileLine } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/EnvFileLine/EnvFileLine";
import { SupabaseBackupPaths } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseBackupPaths";
import { SupabaseBackupStore } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseBackupStore";
import { SupabaseConfig } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseConfig/SupabaseConfig";
import { SHARED_STACK_BRANCH } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment.constants";
import { promiseMap, prop } from "@avandar/utils";
import type {
  DevelopmentEnvFile,
  SupabaseBackupManifest,
  SupabaseEnvironmentDrift,
  SupabaseLocalEnvironmentIO,
  SupabaseLocalStatus,
  SupabaseStatusEntry,
  SupabaseStatusReport,
} from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types";

type MakeStatusReportOptions = {
  branch: string;
  configContents: string;
  manifest: SupabaseBackupManifest | undefined;
  statusJson: string | undefined;
  envFiles: readonly DevelopmentEnvFile[];
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
    return assignment !== undefined && line !== expectedLines[lineIndex] ?
        [assignment.key]
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

function _makeStatusReport(
  options: Readonly<MakeStatusReportOptions>,
): SupabaseStatusReport {
  const { branch, configContents, manifest, statusJson, envFiles } = options;
  const config = SupabaseConfig.makeStateFromContents(configContents);
  const status = _readLocalStatus(statusJson);
  const isSwitched = manifest?.temporaryProjectId === config.projectId;
  return {
    isSwitched,
    isExpectedForBranch: isSwitched !== (branch === SHARED_STACK_BRANCH),
    isRunning: status !== undefined,
    branch,
    projectId: config.projectId,
    ports: _makePorts({
      ports: config.ports,
      devServerPort: DevServerPort.fromEnvFiles(envFiles.map(prop("contents"))),
    }),
    environmentValues:
      status === undefined ? [] : _makeEnvironmentValues(status),
    endpoints:
      status === undefined || statusJson === undefined ?
        []
      : _makeEndpoints(statusJson),
    environmentDrift:
      status === undefined ? [] : _makeEnvironmentDrift({ envFiles, status }),
  };
}

/** Reads this branch's backup manifest, if a switch left one behind. */
async function _readManifest(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIO;
    branch: string;
    worktreePath: string;
  }>,
): Promise<SupabaseBackupManifest | undefined> {
  const backupDirectory = SupabaseBackupPaths.backupDirectory({
    projectRoot: options.io.projectRoot,
    branch: options.branch,
    worktreePath: options.worktreePath,
  });
  try {
    return await SupabaseBackupStore.readManifest({
      io: options.io,
      backupDirectory,
    });
  } catch {
    return undefined;
  }
}

async function _readStatusJson(
  io: Readonly<SupabaseLocalEnvironmentIO>,
): Promise<string | undefined> {
  const result = await io.runSupabase(["status", "-o", "json"]);
  return result.ok ? result.stdout : undefined;
}

async function _readStatusReport(
  io: Readonly<SupabaseLocalEnvironmentIO>,
): Promise<SupabaseStatusReport> {
  const [branch, worktreePath, configContents, envFilePaths, statusJson] =
    await Promise.all([
      io.readBranch(),
      io.readWorktreePath(),
      io.readTextFile(path.join(io.projectRoot, "supabase", "config.toml")),
      io.findDevelopmentEnvFiles(),
      _readStatusJson(io),
    ]);
  const [manifest, envFiles] = await Promise.all([
    _readManifest({ io, branch, worktreePath }),
    promiseMap(envFilePaths, async (filePath) => {
      return { filePath, contents: await io.readTextFile(filePath) };
    }),
  ]);
  return _makeStatusReport({
    branch,
    configContents,
    manifest,
    statusJson,
    envFiles,
  });
}

/** Summarizes which local Supabase a worktree is pointed at. */
export const SupabaseStatus = {
  /** Builds the report `ava supabase status` prints. */
  makeStatusReport: _makeStatusReport,

  /** Reads everything `ava supabase status` reports on. */
  readStatusReport: _readStatusReport,
};

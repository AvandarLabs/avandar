import { EnvFileLine } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/EnvFileLine/EnvFileLine";
import {
  APP_URL_ENV_KEY,
  DEFAULT_DEV_SERVER_PORT,
  DEV_SERVER_PORT_ENV_KEY,
  MAX_TCP_PORT,
  MIN_TCP_PORT,
} from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment.constants";
import { isDefined } from "@avandar/utils";

/** Comment written above an appended dev-server port assignment. */
const DEV_SERVER_PORT_COMMENT =
  "# Vite dev-server port for this worktree. Managed by `ava supabase switch`.";

type GetAvailableDevServerPortOptions = {
  currentDevServerPort: number;
  portDelta: number;
  reservedPorts: readonly number[];
  isPortAvailable: (port: number) => Promise<boolean>;
};

function _getEnvValueFromLine(
  options: Readonly<{ line: string; key: string }>,
): string | undefined {
  const assignment = EnvFileLine.getAssignment(options.line);
  return assignment?.key === options.key ?
      EnvFileLine.getUnquotedValue(assignment.value)
    : undefined;
}

function _getEnvValueFromContents(
  options: Readonly<{ envContents: string; key: string }>,
): string | undefined {
  return options.envContents
    .split("\n")
    .map((line) => {
      return _getEnvValueFromLine({ line, key: options.key });
    })
    .find(isDefined);
}

function _getPortFromText(text: string): number | undefined {
  const port = Number(text);
  return (
      text !== "" &&
        Number.isInteger(port) &&
        port >= MIN_TCP_PORT &&
        port <= MAX_TCP_PORT
    ) ?
      port
    : undefined;
}

function _getPortFromAppUrl(envContents: string): number | undefined {
  const appUrl = _getEnvValueFromContents({
    envContents,
    key: APP_URL_ENV_KEY,
  });
  const loopbackAppUrl =
    appUrl === undefined ? undefined : EnvFileLine.getLoopbackUrl(appUrl);
  return loopbackAppUrl === undefined ? undefined : (
      _getPortFromText(loopbackAppUrl.port)
    );
}

function _getPortFromEnvContents(envContents: string): number | undefined {
  const pinnedPort = _getEnvValueFromContents({
    envContents,
    key: DEV_SERVER_PORT_ENV_KEY,
  });
  return pinnedPort === undefined ?
      _getPortFromAppUrl(envContents)
    : _getPortFromText(pinnedPort);
}

function _getPortFromEnvFiles(envContentsList: readonly string[]): number {
  return (
    envContentsList.map(_getPortFromEnvContents).find(isDefined) ??
    DEFAULT_DEV_SERVER_PORT
  );
}

function _requireValidPort(port: number): number {
  if (!Number.isInteger(port) || port < MIN_TCP_PORT || port > MAX_TCP_PORT) {
    throw new Error(
      `Dev-server port ${port} is outside the valid TCP port range.`,
    );
  }
  return port;
}

async function _findAvailableDevServerPort(
  options: Readonly<{
    candidatePort: number;
    reservedPorts: readonly number[];
    isPortAvailable: (port: number) => Promise<boolean>;
  }>,
): Promise<number> {
  const { candidatePort, reservedPorts, isPortAvailable } = options;
  _requireValidPort(candidatePort);
  return (
      !reservedPorts.includes(candidatePort) &&
        (await isPortAvailable(candidatePort))
    ) ?
      candidatePort
    : await _findAvailableDevServerPort({
        ...options,
        candidatePort: candidatePort + 1,
      });
}

async function _getAvailable(
  options: Readonly<GetAvailableDevServerPortOptions>,
): Promise<number> {
  const { currentDevServerPort, portDelta, reservedPorts, isPortAvailable } =
    options;
  return portDelta === 0 ? currentDevServerPort : (
      await _findAvailableDevServerPort({
        candidatePort: _requireValidPort(currentDevServerPort + portDelta),
        reservedPorts,
        isPortAvailable,
      })
    );
}

function _makeEnvLineWithDevServerPort(
  options: Readonly<{ line: string; devServerPort: number }>,
): string {
  const { line, devServerPort } = options;
  if (
    _getEnvValueFromLine({ line, key: DEV_SERVER_PORT_ENV_KEY }) !== undefined
  ) {
    return `${DEV_SERVER_PORT_ENV_KEY}=${devServerPort}`;
  }
  const appUrl = _getEnvValueFromLine({ line, key: APP_URL_ENV_KEY });
  const loopbackAppUrl =
    appUrl === undefined ? undefined : EnvFileLine.getLoopbackUrl(appUrl);
  if (loopbackAppUrl === undefined) {
    return line;
  }
  loopbackAppUrl.port = String(devServerPort);
  return `${APP_URL_ENV_KEY}=${loopbackAppUrl.toString()}`;
}

function _toDevelopmentEnv(
  options: Readonly<{ envContents: string; devServerPort: number }>,
): string {
  const { envContents, devServerPort } = options;
  const rewrittenContents = envContents
    .split("\n")
    .map((line) => {
      return _makeEnvLineWithDevServerPort({ line, devServerPort });
    })
    .join("\n");
  const hasPinnedPort =
    _getEnvValueFromContents({
      envContents: rewrittenContents,
      key: DEV_SERVER_PORT_ENV_KEY,
    }) !== undefined;
  const separator = rewrittenContents.endsWith("\n") ? "" : "\n";
  return hasPinnedPort ? rewrittenContents : (
      `${rewrittenContents}${separator}\n${DEV_SERVER_PORT_COMMENT}\n${DEV_SERVER_PORT_ENV_KEY}=${devServerPort}\n`
    );
}

/** Derives and records the Vite dev-server port a worktree serves on. */
export const DevServerPort = {
  /**
   * Reads the port an environment file currently serves on.
   *
   * A pinned `AVA_VITE_DEV_PORT` wins; otherwise the port is taken from a
   * loopback app URL, since that is where an unpinned worktree records it.
   */
  fromEnvContents: _getPortFromEnvContents,

  /** Reads the port in use, falling back to the standard one. */
  fromEnvFiles: _getPortFromEnvFiles,

  /**
   * Shifts the dev-server port by the same delta as the Supabase ports.
   *
   * Tying both to one delta gives every switched worktree its own dev-server
   * port without a second reservation scheme: two worktrees cannot hold the
   * same Supabase base port, so they cannot derive the same dev-server port
   * either. The derived port is still probed, and walks upward past anything
   * already listening or reserved by the Supabase port set.
   */
  getAvailable: _getAvailable,

  /** Pins the dev-server port and repoints a loopback app URL at it. */
  toDevelopmentEnv: _toDevelopmentEnv,
};

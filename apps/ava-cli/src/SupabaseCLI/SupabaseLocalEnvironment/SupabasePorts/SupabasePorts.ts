import { objectValuesMap, promiseMap, propEq } from "@avandar/utils";
import type { SupabaseConfigState } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types";

const MIN_PORT = 1;
const MAX_PORT = 65_535;
const AUTOMATIC_PORT_OFFSET = 1_000;
const CANDIDATE_INCREMENT = 20;

/** Shifts every configured port by the requested API-port delta. */
type FindAutomaticBasePortOptions = {
  currentApiPort: SupabaseConfigState["apiPort"];
  currentPorts: SupabaseConfigState["ports"];
  candidate: number;
  isPortAvailable: (port: number) => Promise<boolean>;
};

type GetAvailableBasePortOptions = {
  currentApiPort: SupabaseConfigState["apiPort"];
  currentPorts: SupabaseConfigState["ports"];
  requestedBasePort?: number;
  isPortAvailable: (port: number) => Promise<boolean>;
};

function _makeDerivedPortsFromBasePort(
  options: Readonly<{
    currentApiPort: SupabaseConfigState["apiPort"];
    currentPorts: SupabaseConfigState["ports"];
    basePort: number;
  }>,
): Record<string, number> {
  const { currentApiPort, currentPorts, basePort } = options;
  const delta = basePort - currentApiPort;
  const derivedPorts = objectValuesMap(currentPorts, (port) => {
    return port + delta;
  });
  const invalidPort = Object.values(derivedPorts).find((port) => {
    return !Number.isInteger(port) || port < MIN_PORT || port > MAX_PORT;
  });
  if (invalidPort !== undefined) {
    throw new Error(
      `Derived port ${invalidPort} is outside the valid TCP port range.`,
    );
  }
  return derivedPorts;
}

async function _findOccupiedPort(
  options: Readonly<{
    ports: readonly number[];
    isPortAvailable: (port: number) => Promise<boolean>;
  }>,
): Promise<number | undefined> {
  const { ports, isPortAvailable } = options;
  const availability = await promiseMap(ports, async (port) => {
    return { port, isAvailable: await isPortAvailable(port) };
  });
  return availability.find(propEq("isAvailable", false))?.port;
}

async function _findAutomaticBasePort(
  options: Readonly<FindAutomaticBasePortOptions>,
): Promise<number> {
  const { currentApiPort, currentPorts, candidate, isPortAvailable } = options;
  const derivedPorts = _makeDerivedPortsFromBasePort({
    currentApiPort,
    currentPorts,
    basePort: candidate,
  });
  const occupiedPort = await _findOccupiedPort({
    ports: Object.values(derivedPorts),
    isPortAvailable,
  });
  if (occupiedPort === undefined) {
    return candidate;
  }
  const nextCandidate = candidate + CANDIDATE_INCREMENT;
  if (nextCandidate > MAX_PORT) {
    throw new Error("No complete Supabase port set is available.");
  }
  return await _findAutomaticBasePort({
    currentApiPort,
    currentPorts,
    candidate: nextCandidate,
    isPortAvailable,
  });
}

/** Finds a base whose complete derived Supabase port set is available. */
async function _getAvailableBasePortFromPorts(
  options: Readonly<GetAvailableBasePortOptions>,
): Promise<number> {
  const { currentApiPort, currentPorts, requestedBasePort, isPortAvailable } =
    options;
  if (requestedBasePort !== undefined) {
    const derivedPorts = _makeDerivedPortsFromBasePort({
      currentApiPort,
      currentPorts,
      basePort: requestedBasePort,
    });
    const occupiedPort = await _findOccupiedPort({
      ports: Object.values(derivedPorts),
      isPortAvailable,
    });
    if (occupiedPort === undefined) {
      return requestedBasePort;
    }
    throw new Error(`Derived port ${occupiedPort} is already in use.`);
  }
  return await _findAutomaticBasePort({
    currentApiPort,
    currentPorts,
    candidate: currentApiPort + AUTOMATIC_PORT_OFFSET,
    isPortAvailable,
  });
}

/** Derives and reserves collision-free Supabase port sets. */
export const SupabasePorts = {
  /** Shifts every configured port by the requested API-port delta. */
  makeDerivedPortsFromBasePort: _makeDerivedPortsFromBasePort,
  /** Finds a base whose complete derived Supabase port set is available. */
  getAvailableBasePortFromPorts: _getAvailableBasePortFromPorts,
};

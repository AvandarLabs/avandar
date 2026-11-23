import type { ThemeSaveStatus } from "./useThemeSaving.types";

/**
 * A stand-in for the state a theme request touches: the in-flight guard and
 * a status setter that records every status it is given.
 */
export function createRequestHarness() {
  const statuses: ThemeSaveStatus[] = [];
  return {
    statuses,
    inFlight: { current: false },
    setStatus: (status: ThemeSaveStatus) => statuses.push(status),
  };
}

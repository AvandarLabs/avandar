import type { ThemeSaveStatus } from "./useThemeSaving.types";

type RequestHarness = {
  statuses: ThemeSaveStatus[];
  inFlight: { current: boolean };
  setStatus: (status: ThemeSaveStatus) => number;
};

/**
 * A stand-in for the state a theme request touches: the in-flight guard and
 * a status setter that records every status it is given.
 */
export function createRequestHarness(): RequestHarness {
  const statuses: ThemeSaveStatus[] = [];
  return {
    statuses,
    inFlight: { current: false },
    setStatus: (status: ThemeSaveStatus) => {
      return statuses.push(status);
    },
  };
}

import { Boat } from "./Boat";
import { RoadCarrier } from "./RoadCarrier";
import type { Input } from "../AidCargoModeHandoff.schema";
import type { ReactNode } from "react";

type Props = { mode: Input["carriers"][number]["mode"]; accent: string };

/** Each authored transport mode has a distinct supporting silhouette. */
export function CargoCarrierShape({
  mode,
  accent,
}: Readonly<Props>): ReactNode {
  return mode === "boat" ? (
    <Boat accent={accent} />
  ) : (
    <RoadCarrier mode={mode} accent={accent} />
  );
}

import { RaceStats } from "../RaceStats/RaceStats";
import { RaceWindows } from "./RaceWindows/RaceWindows";
import { useRacePairState } from "./useRacePairState";
import type { Props } from "./RacePair.types";
import type { ReactNode } from "react";

/**
 * Two windows side by side, each with a label above and a live counter
 * below, for a race between two runs of the same task. The pair can enter
 * as one card that flips in and splits apart. The mirrored tilt is the
 * pair's part of `components.WindowTilt`.
 */
export function RacePair({ pair, ...scene }: Readonly<Props>): ReactNode {
  const props = { pair, ...scene };
  const content = useRacePairState({ props });
  return (
    <>
      <RaceWindows {...content} />
      {pair.map((column, side) => {
        return (
          <RaceStats
            key={`${side}-${column.label}`}
            {...props}
            column={column}
            side={side}
            labelsAt={content.at + 2}
            stage={content.stage}
          />
        );
      })}
    </>
  );
}

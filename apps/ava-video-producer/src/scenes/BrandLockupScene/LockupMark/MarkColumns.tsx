import { useVideoMotion } from "../../../videoTheme/useVideoMotion";
import { useVideoProps } from "../../../videoTheme/useVideoTheme";
import { BrandLockupMotion } from "../BrandLockupMotion/BrandLockupMotion";
import { FlightStage } from "./FlightStage";
import { LockupMarkShared } from "./LockupMarkShared/LockupMarkShared";
import { type MarkColumnsProps as Props } from "./LockupMarkShared/LockupMarkShared.types";
import { MarkColumn } from "./MarkColumn";
import type { ReactNode } from "react";
/** The mark as column masks, rising while it builds and turning as it flies. */
export function MarkColumns({
  frame,
  build,
  exit,
  mark,
  width,
  height,
  src,
  columns,
}: Props): ReactNode {
  const motion = useVideoMotion();
  const getFlightColumnRect = BrandLockupMotion.getFlightColumnRect;
  const lockup = useVideoProps("BrandLockup", {});
  const { flightTilt, flightPerspective, columnStagger } = lockup;
  const buildMotion = { motion, columnStagger };
  const stage = { width, height };
  const rise = BrandLockupMotion.getMarkBuildProgress({
    frame,
    build,
    columns,
    buildMotion,
  });
  const flights = LockupMarkShared.getColumnFlights({
    frame,
    exit,
    columnCount: rise.length,
    motion,
  });
  const tilt = LockupMarkShared.getFlightTilt({ flights, columns, flightTilt });
  return (
    <FlightStage tilt={tilt} perspective={flightPerspective}>
      {rise.map((columnRise, index) => {
        const flight = flights[index];
        const rect = getFlightColumnRect(index, columns, mark, stage, flight);
        return (
          // prettier-ignore
          // These are fixed left-to-right slices of one mark. A
          // column slot retains its identity while its rise and
          // flight values animate.
          // react-doctor-disable-next-line no-array-index-as-key
          <MarkColumn key={`mark-column-${index}`}
            {...{ frame, exit, src, columns, columnRise, index }}
            rect={rect}
          />
        );
      })}
    </FlightStage>
  );
}

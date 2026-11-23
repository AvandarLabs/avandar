import { useVideoMotion } from "../../../videoTheme/useVideoMotion";
import { useVideoProps } from "../../../videoTheme/videoThemeHelpers";
import { BrandLockupMotion } from "../BrandLockupMotion/BrandLockupMotion";
import { FlightStage } from "./FlightStage";
import { FlyingMarkColumns } from "./FlyingMarkColumns/FlyingMarkColumns";
import { LockupMarkShared } from "./LockupMarkShared/LockupMarkShared";
import type { MarkColumnsProps as Props } from "./LockupMarkShared/LockupMarkShared.types";
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
  const lockup = useVideoProps({
    name: "BrandLockup",
    props: {},
  });
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
      <FlyingMarkColumns
        {...{ frame, exit, src, columns, rise, flights, mark, stage }}
      />
    </FlightStage>
  );
}

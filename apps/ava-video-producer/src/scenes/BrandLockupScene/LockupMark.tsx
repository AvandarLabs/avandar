import { Img, staticFile } from "remotion";
import { useVideoMotion } from "../../videoTheme/useVideoMotion";
import { useVideoProps, useVideoTokens } from "../../videoTheme/useVideoTheme";
import { safePublicPath } from "../layout/layout";
import { positioned } from "../positioned";
import {
  MARK_BUILD_DEFAULTS,
  getFlightColumnRect,
  getFlightProgress,
  getMarkBuildEndFrame,
  getMarkBuildProgress,
} from "./brandLockupMotion";
import type { ThemeTokenName } from "../../storyboard/schema/themeSchema";
import type { VideoMotion } from "../../videoTheme/createVideoMotion/createVideoMotion";
import type { ResolvedVideoSemantic } from "../../videoTheme/videoTheme.types";
import type { Rect } from "../layout/layout";
import type { BrandLockupSceneProps } from "../scenes.types";
import type { ReactNode } from "react";

/** A storyboard theme name as its scene palette colour, `brand-soft` as
 *  `color.scene.brandSoft`. */
function _sceneColorFromName(
  tokens: ResolvedVideoSemantic,
  name: ThemeTokenName,
): string | undefined {
  const key = name.replace(/-([a-z])/g, (_, letter: string) => {
    return letter.toUpperCase();
  }) as keyof ResolvedVideoSemantic["color"]["scene"];
  return tokens.color.scene[key];
}

/** The mark: whole at rest, as column masks while building or flying. */
export function LockupMark({
  frame,
  logo,
  build,
  exit,
  mark,
  width,
  height,
}: BrandLockupSceneProps & {
  mark: Rect;
  width: number;
  height: number;
}): ReactNode {
  const motion = useVideoMotion();
  const { columnStagger } = useVideoProps("BrandLockup", {});
  const buildMotion = { motion, columnStagger };
  const src = staticFile(safePublicPath(logo.src));
  const columns = build?.columns ?? MARK_BUILD_DEFAULTS.columns;
  const isBuilt = frame >= getMarkBuildEndFrame(build, buildMotion);
  const isFlying = getFlightProgress(frame, exit, motion).flight > 0;
  if (isBuilt && !isFlying) {
    return (
      <Img
        src={src}
        alt=""
        style={{ ...positioned(mark), objectFit: "fill" }}
      />
    );
  }
  return (
    <MarkColumns
      {...{ frame, build, exit, mark, width, height, src, columns }}
    />
  );
}

type MarkColumnsProps = Pick<
  BrandLockupSceneProps,
  "frame" | "build" | "exit"
> &
  Readonly<{
    mark: Rect;
    width: number;
    height: number;
    src: string;
    columns: number;
  }>;

/** The mark as column masks, rising while it builds and turning as it flies. */
function MarkColumns({
  frame,
  build,
  exit,
  mark,
  width,
  height,
  src,
  columns,
}: MarkColumnsProps): ReactNode {
  const motion = useVideoMotion();
  const { flightTilt, flightPerspective, columnStagger } = useVideoProps(
    "BrandLockup",
    {},
  );
  const buildMotion = { motion, columnStagger };
  const rise = getMarkBuildProgress(frame, build, columns, buildMotion);
  const flights = _getColumnFlights(frame, exit, rise.length, motion);
  const tilt = _getFlightTilt(flights, columns, flightTilt);
  return (
    <FlightStage tilt={tilt} perspective={flightPerspective}>
      {rise.map((columnRise, index) => {
        return (
          <MarkColumn
            key={`mark-column-${index}`}
            {...{ frame, exit, src, columns, columnRise, index }}
            rect={getFlightColumnRect(
              index,
              columns,
              mark,
              { width, height },
              flights[index],
            )}
          />
        );
      })}
    </FlightStage>
  );
}

/** The columns turn most at the middle of the flight. */
function _getFlightTilt(
  flights: readonly number[],
  columns: number,
  flightTilt: number,
): number {
  const meanFlight =
    flights.reduce((sum, value) => {
      return sum + value;
    }, 0) / columns;
  return flightTilt * Math.sin(Math.PI * meanFlight);
}

/** The full-frame stage the mark's columns turn on while they fly. */
function FlightStage({
  tilt,
  perspective,
  children,
}: Readonly<{
  tilt: number;
  perspective: number;
  children: ReactNode;
}>): ReactNode {
  return (
    <div style={{ position: "absolute", inset: 0, perspective }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `rotateY(${tilt.toFixed(2)}deg)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** Each column's flight progress, staggered by the column stagger. */
function _getColumnFlights(
  frame: number,
  exit: BrandLockupSceneProps["exit"],
  columnCount: number,
  motion: VideoMotion,
): number[] {
  return Array.from({ length: columnCount }, (_, index) => {
    return getFlightProgress(
      frame - index * motion.stagger.column,
      exit,
      motion,
    ).flight;
  });
}

/** One column mask of the mark, risen and covered by the flight colour. */
function MarkColumn({
  frame,
  exit,
  src,
  columns,
  columnRise,
  index,
  rect,
}: Readonly<{
  frame: number;
  exit: BrandLockupSceneProps["exit"];
  src: string;
  columns: number;
  columnRise: number;
  index: number;
  rect: Rect;
}>): ReactNode {
  return (
    <div
      style={{
        ...positioned(rect),
        overflow: "hidden",
        clipPath: `inset(${((1 - columnRise) * 100).toFixed(2)}% 0 0 0)`,
      }}
    >
      <Img
        src={src}
        alt=""
        style={{
          position: "absolute",
          left: -index * rect.width,
          top: 0,
          width: rect.width * columns,
          height: rect.height,
        }}
      />
      <MarkColumnCover frame={frame} exit={exit} />
    </div>
  );
}

/** The flight colour fading over a column as the flight covers the frame. */
function MarkColumnCover({
  frame,
  exit,
}: Readonly<{
  frame: number;
  exit: BrandLockupSceneProps["exit"];
}>): ReactNode {
  const tokens = useVideoTokens();
  const motion = useVideoMotion();
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: _sceneColorFromName(tokens, exit?.color ?? "brand"),
        opacity: getFlightProgress(frame, exit, motion).cover,
      }}
    />
  );
}

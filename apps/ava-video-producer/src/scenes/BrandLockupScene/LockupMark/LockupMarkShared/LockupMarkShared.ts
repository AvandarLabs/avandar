import { BrandLockupMotion } from "../../BrandLockupMotion/BrandLockupMotion";
import type { ThemeTokenName } from "../../../../storyboard/schema/themeSchema";
import type { VideoMotion } from "../../../../videoTheme/createVideoMotion/createVideoMotion";
import type { ResolvedVideoSemantic } from "../../../../videoTheme/videoTheme.types";
import type { BrandLockupSceneProps } from "../../../scenes.types";

type GetColumnFlightsOptions = {
  frame: number;
  exit: BrandLockupSceneProps["exit"];
  columnCount: number;
  motion: VideoMotion;
};
/**
 * A storyboard theme name as its scene palette colour, `brand-soft` as
 * `color.scene.brandSoft`.
 */
function _sceneColorFromName({
  tokens,
  name,
}: Readonly<{ tokens: ResolvedVideoSemantic; name: ThemeTokenName }>):
  | string
  | undefined {
  const key = name.replace(/-([a-z])/g, (_, letter: string) => {
    return letter.toUpperCase();
  }) as keyof ResolvedVideoSemantic["color"]["scene"];
  return tokens.color.scene[key];
}
/** The columns turn most at the middle of the flight. */
function _getFlightTilt({
  flights,
  columns,
  flightTilt,
}: Readonly<{
  flights: readonly number[];
  columns: number;
  flightTilt: number;
}>): number {
  const meanFlight =
    flights.reduce((sum, value) => {
      return sum + value;
    }, 0) / columns;
  return flightTilt * Math.sin(Math.PI * meanFlight);
}
/** Each column's flight progress, staggered by the column stagger. */
function _getColumnFlights({
  frame,
  exit,
  columnCount,
  motion,
}: Readonly<GetColumnFlightsOptions>): number[] {
  return Array.from({ length: columnCount }, (_, index) => {
    return BrandLockupMotion.getFlightProgress({
      frame: frame - index * motion.stagger.column,
      exit,
      motion,
    }).flight;
  });
}
/** Shared values and calculations for the LockupMark visuals. */
export const LockupMarkShared = {
  /** Each column's flight progress, staggered by the column stagger. */
  getColumnFlights: _getColumnFlights,
  /** The columns turn most at the middle of the flight. */
  getFlightTilt: _getFlightTilt,
  /**
   * A storyboard theme name as its scene palette colour, `brand-soft` as
   * `color.scene.brandSoft`.
   */
  sceneColorFromName: _sceneColorFromName,
} as const;

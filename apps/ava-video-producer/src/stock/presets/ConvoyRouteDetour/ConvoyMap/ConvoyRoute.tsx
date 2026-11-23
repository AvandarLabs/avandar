import { Motion } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../ConvoyRouteDetour.schema";
import type { ReactNode } from "react";

type ParentProps = {
  input: Input;
  frame: number;
  accent: string;
};

type GetRouteStrokeWidthOptions = {
  frame: Readonly<ParentProps>["frame"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  route: Readonly<ParentProps>["input"]["routes"][number];
};

type GetRoutePathOptions = {
  route: Readonly<ParentProps>["input"]["routes"][number];
};

type Props = Pick<ParentProps, "frame" | "accent"> & {
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  route: Input["routes"][number];
  index: number;
};

/** The width the detour swells to once it is chosen. */
const DETOUR_WIDTH = 5;

/** Samples the route path for the current authored frame. */
function _getRoutePath(
  route: Readonly<Readonly<GetRoutePathOptions>["route"]>,
): {
  kind: "path";
  d: ReturnType<string[]["join"]>;
} {
  return {
    kind: "path",
    d: route.points
      .map((point, pointIndex) => {
        return `${pointIndex ? "L" : "M"}${80 + point.x * 800} ${180 + point.y * 280}`;
      })
      .join(" "),
  };
}

/** Samples the route stroke width for the current authored frame. */
function _getRouteStrokeWidth({
  frame,
  tokens,
  motion,
  scales,
  route,
}: Readonly<GetRouteStrokeWidthOptions>): number {
  return scales.stroke(
    route.role === "detour"
      ? Motion.mix({
          t: motion.ramp(frame, 60, motion.hero),
          from: tokens.stroke.emphasis,
          to: DETOUR_WIDTH,
        })
      : tokens.stroke.heavy,
  );
}

/** Renders the convoy route in authored paint order. */
export function ConvoyRoute(options: Readonly<Props>): ReactNode {
  return (
    <SketchedShape
      key={options.route.role}
      shape={_getRoutePath(options.route)}
      profile={options.tokens.sketch.shape}
      data-road={options.route.role}
      data-route-id={options.route.id}
      fill="none"
      stroke={
        options.route.role === "detour"
          ? options.accent
          : options.tokens.color.inactive
      }
      strokeWidth={_getRouteStrokeWidth({
        frame: options.frame,
        tokens: options.tokens,
        motion: options.motion,
        scales: options.scales,
        route: options.route,
      })}
      strokeOpacity={options.motion.ramp(
        options.frame,
        10 + options.index * options.motion.scaleStagger(3),
        options.motion.word,
      )}
      strokeLinejoin="round"
    />
  );
}

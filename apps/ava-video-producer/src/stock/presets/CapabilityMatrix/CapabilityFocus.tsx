import { Motion } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./CapabilityMatrix.schema";
import type { ReactNode } from "react";

type CapabilityFocusBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};
type CapabilityFocusGeometry = {
  focus: number;
  y: number;
  bounds: CapabilityFocusBounds;
};

type Props = {
  frame: number;
  input: Input;
  accent: string;
};
/** Frames the scanning rule takes to cross every row. */
const SCAN_FRAMES = 72;
/** The focus outline's corner before the corner style scales it. */
const FOCUS_CORNER = 7;
/** The collapsed height a focused row opens from. */
const COLLAPSED_ROW_HEIGHT = 2;

type GetCapabilityFocusGeometryOptions = {
  frame: number;
  input: Input;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
};
/** Samples the authored capability focus geometry. */
function _getCapabilityFocusGeometry({
  frame,
  input,
  scales,
  motion,
}: Readonly<GetCapabilityFocusGeometryOptions>): CapabilityFocusGeometry {
  const columnWidth = 606 / input.options.length;
  const height = input.capabilities.length * 66;
  const isRow = input.focus.kind === "row";
  const focusIndex = (isRow ? input.capabilities : input.options).findIndex(
    ({ id }) => {
      return id === input.focus.id;
    },
  );
  const focus = motion.reveal(frame, 108);
  const y =
    176 +
    height *
      Motion.ramp({
        frame,
        at: 36,
        dur: motion.scale(SCAN_FRAMES),
        easing: motion.travel.easing,
      });
  const bounds = {
    x: isRow ? 54 : 302 + focusIndex * columnWidth,
    y: isRow ? 176 + focusIndex * 66 : 94,
    width: isRow ? 854 : columnWidth,
    height: isRow
      ? Motion.mix({ t: focus, from: COLLAPSED_ROW_HEIGHT, to: 66 })
      : height + 82,
    rx: scales.corner(FOCUS_CORNER),
  };
  return { focus, y, bounds };
}

/** A scanning rule resolves the rows before an authored row or column opens. */
export function CapabilityFocus({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const { focus, y, bounds } = _getCapabilityFocusGeometry({
    frame,
    input,
    scales,
    motion,
  });
  return (
    <g>
      <SketchedShape
        shape={{ kind: "line", x1: 54, x2: 908, y1: y, y2: y }}
        profile={tokens.sketch.shape}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.default)}
        opacity={
          Motion.ramp({
            frame,
            at: 36,
            dur: motion.chip,
            easing: motion.reveal.easing,
          }) *
          (1 - focus)
        }
      />
      {input.focus.kind !== "none" ? (
        <StockRect
          data-focus={`${input.focus.kind}:${input.focus.id}`}
          {...bounds}
          fill="none"
          stroke={accent}
          strokeWidth={scales.stroke(tokens.stroke.default)}
          opacity={focus}
        />
      ) : null}
    </g>
  );
}

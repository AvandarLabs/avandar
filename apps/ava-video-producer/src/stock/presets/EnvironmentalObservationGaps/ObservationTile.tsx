import { mix } from "../../../motion";
import { Text } from "../../graphics-common/Text";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { makeObservationLayoutFromInput } from "./makeObservationLayoutFromInput";
import { ObservationCell } from "./ObservationCell";
import type { Input } from "./EnvironmentalObservationGaps.schema";
import type { ReactNode } from "react";
/** Inputs for ObservationTile. */
type Props = { frame: number; accent: string; id: string; input: Input };

/**
 * A lifting cloud sheet reveals readings without replacing the missing cells.
 */
export function ObservationTile({
  frame,
  accent,
  id,
  input,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const { cells, checks } = makeObservationLayoutFromInput(input);
  const lift = motion.ramp(frame, 36, motion.scale(20), motion.travel.easing),
    unfold = motion.ramp(frame, 16, motion.hero, motion.travel.easing);
  const patternId = `${id}-missing-hatch`;
  return (
    <g opacity={unfold} transform={`translate(0 ${mix(unfold, 12, 0)})`}>
      <defs>
        <pattern
          id={patternId}
          width={8}
          height={8}
          patternUnits="userSpaceOnUse"
        >
          <SketchedShape
            shape={{
              kind: "path",
              d: "M -2 2 L 2 -2 M 0 8 L 8 0 M 6 10 L 10 6",
            }}
            profile={tokens.sketch.shape}
            stroke={tokens.color.inactive}
            strokeWidth={scales.stroke(tokens.stroke.hairline)}
          />
        </pattern>
      </defs>
      {cells.map((cell) => {
        return (
          <ObservationCell
            key={cell.id}
            cell={cell}
            metric={input.metric}
            accent={accent}
            patternId={patternId}
          />
        );
      })}
      <g
        data-cloud-layer="true"
        opacity={1 - lift}
        transform={`translate(0 ${-14 * lift})`}
      >
        <rect
          x={270}
          y={105}
          width={650}
          height={300}
          rx={scales.corner(tokens.corner.panel)}
          fill={tokens.color.elevated}
        />
        <SketchedShape
          shape={{
            kind: "path",
            d: "M 285 170 Q 350 130 415 170 T 675 170 T 905 170 M 285 290 Q 350 250 415 290 T 675 290 T 905 290",
          }}
          profile={tokens.sketch.shape}
          stroke={tokens.color.inactive}
          strokeWidth={scales.stroke(12)}
          fill="none"
        />
      </g>
      {checks.map((check, index) => {
        return frame >= 70 + index * 18 ? (
          <g key={check.id}>
            <SketchedShape
              shape={{ kind: "circle", cx: check.x, cy: check.y, r: 5 }}
              profile={tokens.sketch.shape}
              data-point-check={check.id}
              fill={tokens.color.highlight}
              stroke={tokens.color.ground}
              strokeWidth={scales.stroke(tokens.stroke.hairline)}
            />
            <Text
              x={check.x + 8}
              y={check.y + 4}
              size={12}
              fill={tokens.color.highlight}
            >
              {check.key}
            </Text>
          </g>
        ) : undefined;
      })}
    </g>
  );
}

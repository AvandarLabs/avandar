import { Text } from "../../graphics-common/Text";
import { RESPONSE_AT, RESPONSE_SIZE } from "./TerminalType.constants";
import type { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Props as TerminalProps } from "./TerminalType.types";
import type { ReactNode } from "react";

type Props = {
  input: TerminalProps["input"];
  frame: TerminalProps["frame"];
  accent: TerminalProps["accent"];
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
  corner: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["corner"];
  shapes: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
};

/** Renders the terminal response layer for TerminalType. */
export function TerminalResponse(props: Readonly<Props>): ReactNode {
  return (
    <g
      opacity={props.motion.ramp(props.frame, RESPONSE_AT, props.motion.sheet)}
    >
      <rect
        x={96}
        y={429}
        width={768}
        height={55}
        rx={props.shapes.corner(props.corner.cell)}
        fill={props.accent}
        fillOpacity={props.shapes.wash(props.atomic.opacity["6"])}
      />
      <Text
        role="field"
        x={114}
        y={463}
        size={RESPONSE_SIZE}
        fill={props.accent}
      >
        {props.input.response}
      </Text>
    </g>
  );
}

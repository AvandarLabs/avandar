import { SketchedShape } from "../../../primitives/SketchedShape";
import { IdentityGuide } from "./IdentityGuide";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Props as ParentProps } from "./TravelingCaseShared.types";
import type { ReactNode } from "react";

type Props = {
  position: Readonly<ParentProps>["position"];
  accent: Readonly<ParentProps>["accent"];
  showGuide: Readonly<ParentProps>["showGuide"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  record: Readonly<ParentProps>["position"]["record"];
  index: Readonly<ParentProps>["position"]["index"];
  x: number;
  y: number;
};

/** Renders the lifted case in authored paint order. */
export function LiftedCase(options: Readonly<Props>): ReactNode {
  return (
    <g>
      {options.showGuide ? (
        <IdentityGuide position={options.position} accent={options.accent} />
      ) : undefined}
      <SketchedShape
        shape={{ kind: "circle", cx: options.x, cy: options.y, r: 9 }}
        profile={options.tokens.sketch.shape}
        data-lifted-case={options.record.id}
        fill={options.tokens.color.surface}
        stroke={options.accent}
      />
      <text
        x={options.x}
        y={options.y + 4}
        fill={options.tokens.color.text}
        textAnchor="middle"
        fontFamily={options.tokens.text.graphic.data.fontFamily}
        fontWeight={options.tokens.text.graphic.data.fontWeight}
        fontSize={options.tokens.text.graphic.data.fontSize}
      >
        {options.index + 1}
      </text>
    </g>
  );
}

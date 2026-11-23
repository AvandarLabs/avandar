import { SketchedShape } from "../../../primitives/SketchedShape";
import { ReadinessRibbonLabels } from "../ReadinessRibbonLabels/ReadinessRibbonLabels";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { getReadinessRibbonGeometry } from "../getReadinessRibbonGeometry";
import type { Input } from "../ReadinessLatch.schema";
import type { ReactNode } from "react";

type ParentProps = {
  participant: Input["participants"][number];
  index: number;
  numParticipants: number;
  maxWork: number;
  frame: number;
  input: Input;
  accent: string;
};

type Props = {
  participant: Readonly<ParentProps>["participant"];
  input: Readonly<ParentProps>["input"];
  accent: Readonly<ParentProps>["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  track: ReturnType<typeof getReadinessRibbonGeometry>["track"];
  ribbon: ReturnType<typeof getReadinessRibbonGeometry>["ribbon"];
  pin: ReturnType<typeof getReadinessRibbonGeometry>["pin"];
  labels: {
    participant: Readonly<ParentProps>["participant"];
    input: Readonly<ParentProps>["input"];
    state:
      | Readonly<ParentProps>["input"]["copy"]["ready"]
      | Readonly<ParentProps>["input"]["copy"]["waiting"];
    horizontal: boolean;
    x: number;
    y: number;
  };
};

/** The retractable pin's line weight, before the theme's line weight scale. */
const PIN_WIDTH = 6;

/** Renders the participant ribbon and pin in authored paint order. */
export function ParticipantRibbonAndPin(options: Readonly<Props>): ReactNode {
  return (
    <>
      <rect
        {...options.track}
        rx={options.scales.corner(options.tokens.corner.chip)}
        fill={options.tokens.color.line}
      />
      <rect
        data-ribbon={options.participant.id}
        {...options.ribbon}
        rx={options.scales.corner(options.tokens.corner.chip)}
        fill={options.accent}
      />
      <SketchedShape
        data-pin={options.participant.id}
        shape={{ kind: "line", ...options.pin }}
        profile={options.tokens.sketch.shape}
        stroke={options.tokens.color.highlight}
        strokeWidth={options.scales.stroke(PIN_WIDTH)}
        strokeLinecap="round"
      />
      {options.input.showLabels ? (
        <ReadinessRibbonLabels {...options.labels} />
      ) : undefined}
    </>
  );
}

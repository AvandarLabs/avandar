import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { StockRect } from "../../../primitives/StockRect";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../ReleaseRepairObligations.schema";
import type { ReactNode } from "react";

type ParentProps = {
  input: Input;
  frame: number;
  accent: string;
  artifactX: number;
};

type Props = {
  input: Readonly<ParentProps>["input"];
  accent: Readonly<ParentProps>["accent"];
  artifactX: Readonly<ParentProps>["artifactX"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
};

/** The guide artifact's corner, before the theme's corner style. */
const GUIDE_CORNER = 3;

/** Renders the release artifact surface in authored paint order. */
export function ReleaseArtifactSurface(options: Readonly<Props>): ReactNode {
  return (
    <>
      <StockRect
        data-release-artifact={options.input.artifact.kind}
        x={options.artifactX}
        y={100}
        width={300}
        height={298}
        rx={options.scales.corner(
          options.input.artifact.kind === "guide"
            ? GUIDE_CORNER
            : options.tokens.corner.panel,
        )}
        stroke={options.accent}
        strokeWidth={options.scales.stroke(options.tokens.stroke.default)}
        fill={options.tokens.color.surface}
      />
      <LabelSlots
        labels={[
          [
            options.input.artifact.label,
            options.artifactX + 20,
            116,
            260,
            12,
            3,
          ],
          [
            options.input.labels.limitations,
            options.artifactX + 20,
            164,
            260,
            12,
            3,
          ],
        ]}
      />
    </>
  );
}

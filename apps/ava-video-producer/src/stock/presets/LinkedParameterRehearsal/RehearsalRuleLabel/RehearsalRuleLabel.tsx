import { FitText } from "../../../primitives/FitText/FitText";
import type { RehearsalOutputGetRehearsalPointerStateValue } from "../RehearsalOutput";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../LinkedParameterRehearsal.schema";
import type { ReactNode } from "react";

type Props = {
  output: Input["outputs"][number];
  source: Input["source"];
  showRules: boolean;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  y: RehearsalOutputGetRehearsalPointerStateValue["y"];
};
/** Displays the affine rule when rule copy is enabled. */
export function RehearsalRuleLabel({
  output,
  source,
  showRules,
  tokens,
  y,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {showRules ? (
        <FitText
          text={`${output.multiplier} × ${source.label} + (${output.offset})`}
          x={32}
          y={y + 56}
          width={896}
          fontSize={12}
          maxLines={1}
          breakLongWords
          normalizeWhitespace
          color={tokens.color.textMuted}
        />
      ) : undefined}
    </>
  );
}

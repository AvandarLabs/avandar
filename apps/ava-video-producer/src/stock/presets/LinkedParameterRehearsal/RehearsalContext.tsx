import { FitText } from "../../primitives/FitText/FitText";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { getRehearsalStateFromInputAndFrame } from "./getRehearsalStateFromInputAndFrame";
import type { Input } from "./LinkedParameterRehearsal.schema";
import type { ReactNode } from "react";

type ParentProps = GraphicProps & {
  input: Input;
};

type Props = {
  input: Readonly<ParentProps>["input"];
  accent: Readonly<ParentProps>["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  label: ReturnType<typeof getRehearsalStateFromInputAndFrame>["label"];
};

/** Renders the rehearsal context in authored paint order. */
export function RehearsalContext(options: Readonly<Props>): ReactNode {
  return (
    <>
      <FitText
        text={options.input.contextLabel}
        x={64}
        y={48}
        width={832}
        fontSize={14}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
        color={options.tokens.color.textMuted}
      />
      <FitText
        text={options.label}
        x={64}
        y={102}
        width={832}
        fontSize={18}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
        color={options.accent}
      />
    </>
  );
}

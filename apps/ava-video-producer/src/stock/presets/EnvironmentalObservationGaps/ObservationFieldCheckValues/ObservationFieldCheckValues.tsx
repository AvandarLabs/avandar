import { Text } from "../../../graphics-common/Text";
import { FitText } from "../../../primitives/FitText/FitText";
import { ObservationFieldCheckLabel } from "../ObservationFieldCheckLabel/ObservationFieldCheckLabel";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../EnvironmentalObservationGaps.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
};

/** Renders the string label with authored geometry. */
export function ObservationFieldCheckValues({
  input,
  tokens,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {input.fieldChecks.map((check, index) => {
        return (
          <g key={check.id}>
            <Text
              x={32 + index * 310}
              y={479}
              role="data"
              fill={tokens.color.highlight}
            >
              {index + 1}
            </Text>
            <ObservationFieldCheckLabel check={check} index={index} />
            <FitText
              text={String(check.value)}
              x={52 + index * 310}
              y={530}
              width={270}
              fontSize={12}
              maxLines={3}
              breakLongWords
              normalizeWhitespace
            />
          </g>
        );
      })}
    </>
  );
}

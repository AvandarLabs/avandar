import { FitText } from "../../primitives/FitText/FitText";
import {
  useGraphicMotion,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Props } from "./QualifyApparentConflict";
import type { ReactNode } from "react";
/** The joining language and qualifier follow the completed context split. */
export function ContextQualifier({ frame, input }: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const resolution = motion.ramp(frame, 96, motion.scale(24));
  return (
    <>
      <g opacity={resolution}>
        <FitText
          text={input.connectorLabel}
          x={480}
          y={460}
          width={840}
          fontSize={18}
          maxLines={1}
          anchor="middle"
          color={tokens.color.positive}
          breakLongWords
          normalizeWhitespace
        />
      </g>
      <g data-qualifier="true" opacity={resolution}>
        <FitText
          text={input.qualifier}
          x={480}
          y={502}
          width={840}
          fontSize={20}
          maxLines={3}
          anchor="middle"
          breakLongWords
          normalizeWhitespace
        />
      </g>
    </>
  );
}

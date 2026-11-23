import { FitText } from "../../../primitives/FitText/FitText";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { type Props as CleanupEditExplanationSharedProps } from "./CleanupEditExplanationShared.types";
import type { ReactNode } from "react";

type Props = {
  row: CleanupEditExplanationSharedProps["row"];
  isInline: boolean;
};

/** The row's edit explanation, inline beside the ghost or under its lane. */
export function EditValue({ row, isInline }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <g data-edit-value={row.id}>
      <FitText
        text={row.editLabel}
        x={isInline ? 514 : 88}
        y={isInline ? 22 : 62}
        width={352}
        fontSize={12}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
        color={tokens.color.textMuted}
      />
    </g>
  );
}

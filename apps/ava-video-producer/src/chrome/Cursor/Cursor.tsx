import { StageThemeBoundary } from "../../scenes/StageTheme/StageThemeBoundary";
import { CursorContent } from "./CursorContent/CursorContent";
import { type Props } from "./CursorShared.types";
import type { ReactNode } from "react";
/**
 * Native assets keep their own hotspot correction; the parent scales around
 * the measured target, so clicking never moves the arrow tip or I-beam
 * center. Size, press, trail, and shadow come from `components.Cursor`.
 */
export function Cursor({
  frame: propsFrame,
  path: propsPath,
  clicks: propsClicks,
  cursor: propsCursor,
}: Props): ReactNode {
  return (
    <StageThemeBoundary>
      <CursorContent
        {...{
          frame: propsFrame,
          path: propsPath,
          clicks: propsClicks,
          cursor: propsCursor,
        }}
      />
    </StageThemeBoundary>
  );
}

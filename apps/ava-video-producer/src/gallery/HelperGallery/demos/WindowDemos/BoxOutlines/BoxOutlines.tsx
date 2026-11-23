import { clsx } from "clsx";
import {
  HEADLINE_BOX,
  PAIR_BOXES,
  WINDOW_BOX,
  WINDOW_BOX_TALL,
} from "../../../../../scenes/TiltedWindowScene/windowTilt";
import { getCanvasRect } from "../../parts/getCanvasRect";
import css from "./BoxOutlines.module.css";
import type { ReactNode } from "react";

/** Each named box, cycled one at a time. */
const NAMED_BOXES = [
  { name: "WINDOW_BOX", boxes: [WINDOW_BOX] },
  { name: "WINDOW_BOX_TALL", boxes: [WINDOW_BOX_TALL] },
  { name: "PAIR_BOXES", boxes: PAIR_BOXES },
  { name: "HEADLINE_BOX", boxes: [HEADLINE_BOX] },
] as const;

/** Drawn height of the headline column, which has no fixed height. */
const HEADLINE_DRAWN_HEIGHT = 0.3;

/** Renders BoxOutlines for live helper catalog previews. */
export function BoxOutlines({ activeIndex }: Readonly<Props>): ReactNode {
  return NAMED_BOXES.flatMap((named, index) => {
    return named.boxes.map((fractions) => {
      const rect = getCanvasRect({
        height: HEADLINE_DRAWN_HEIGHT,
        ...fractions,
      });
      const isActive = index === activeIndex;
      return (
        <div
          key={`${named.name}-${fractions.x}`}
          className={clsx(
            css.boxOutlinesBox,
            isActive && css.boxOutlinesBoxActive,
          )}
          style={{
            left: rect.x,
            top: rect.y,
            width: rect.width,
            height: rect.height,
          }}
        >
          {isActive ? (
            <span className={css.boxOutlinesBoxLabel}>{named.name}</span>
          ) : null}
        </div>
      );
    });
  });
}

type Props = { activeIndex: number };

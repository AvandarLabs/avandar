import layoutClasses from "./TopChannelValue.module.css";
import type { ReactNode } from "react";

type Props = { refilter: number };

/**
 * Text cannot tween, so the two states cross-fade in place rather than
 * swapping on a single frame. The incoming label is an absolutely-positioned
 * overlay: opacity only, nothing here can reflow the row it sits in.
 */
export function TopChannelValue({ refilter }: Readonly<Props>): ReactNode {
  return (
    <span className={layoutClasses.topChannelValueAnchor}>
      <span style={{ opacity: 1 - refilter }}>Organic search</span>
      <span
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          whiteSpace: "nowrap",
          opacity: refilter,
        }}
      >
        Paid social
      </span>
    </span>
  );
}

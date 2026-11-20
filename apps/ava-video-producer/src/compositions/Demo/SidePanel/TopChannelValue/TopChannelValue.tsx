import layoutClasses from "./TopChannelValue.module.css";
import type { ReactNode } from "react";
/**
 * Text cannot tween, so the two states cross-fade in place rather than
 * swapping on a single frame. The incoming label is an absolutely-positioned
 * overlay: opacity only, nothing here can reflow the row it sits in.
 */
export function TopChannelValue({ refilter }: { refilter: number }): ReactNode {
  return (
    <span className={layoutClasses.anchor}>
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

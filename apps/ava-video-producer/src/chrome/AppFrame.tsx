import type { CSSProperties } from "react";
import { TYPE } from "../fonts";
import { Orb } from "./Orb";

export const BAR = 40;
export const HEAD = 68;
export const BODY_Y = BAR + HEAD;

const dot: CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: 99,
  background: "var(--border)",
  display: "block",
};

/** Title bar + header as one unit. Static for the whole clip: a constant
 *  surface is what makes the loop seam free. The frame the clip restarts
 *  on is the frame it ended on, so there is no full-frame luminance jump. */
export function AppFrame({
  w,
  title,
  heading,
  sub,
}: {
  w: number;
  title: string;
  heading: string;
  sub: string;
}) {
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: w,
          height: BAR,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 16px",
          borderBottom: "1px solid var(--border)",
          background: "var(--background)",
          fontFamily: TYPE,
          fontSize: 15,
          color: "var(--muted-foreground)",
        }}
      >
        <i style={dot} />
        <i style={dot} />
        <i style={dot} />
        {title}
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: BAR,
          width: w,
          height: HEAD,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0 24px",
          borderBottom: "1px solid var(--border)",
          background: "var(--background)",
          fontFamily: TYPE,
          color: "var(--foreground)",
        }}
      >
        <Orb />
        <div>
          <div style={{ fontSize: 21, fontWeight: 600 }}>{heading}</div>
          <div style={{ fontSize: 15, color: "var(--muted-foreground)" }}>
            {sub}
          </div>
        </div>
      </div>
    </>
  );
}

import { Motion } from "../../../src/motion";
import type { CSSProperties } from "react";
/** Sample the dialog entrance and backdrop opacity at the current frame. */
export function getCreateModalStyles({ frame }: Readonly<{ frame: number }>): {
  inner: CSSProperties;
  content: CSSProperties;
  overlay: CSSProperties;
} {
  return {
    inner: { position: "absolute", inset: 0 },
    content: {
      ...Motion.enter({
        frame,
        at: 101,
        opts: { y: 12, dur: 16 },
      }),
    },
    overlay: {
      position: "absolute",
      inset: 0,
      backgroundColor: `rgba(0,0,0,${
        Motion.ramp({
          frame,
          at: 101,
          dur: 16,
        }) * 0.6
      })`,
    },
  };
}

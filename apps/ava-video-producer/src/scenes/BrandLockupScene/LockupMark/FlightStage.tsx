import type { ReactNode } from "react";
/** The full-frame stage the mark's columns turn on while they fly. */
export function FlightStage({
  tilt,
  perspective,
  children,
}: Readonly<{
  tilt: number;
  perspective: number;
  children: ReactNode;
}>): ReactNode {
  return (
    <div style={{ position: "absolute", inset: 0, perspective }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `rotateY(${tilt.toFixed(2)}deg)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

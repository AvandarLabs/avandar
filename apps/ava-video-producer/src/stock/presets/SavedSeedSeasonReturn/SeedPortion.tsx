import type { ReactNode } from "react";
type Props = {
  destination: "current" | "remaining" | "sown" | "loss";
  position: { x: number; y: number };
  width: number;
  color: string;
};
/** A fixed-height material band exposes its actual destination geometry. */
export function SeedPortion({
  destination,
  position,
  width,
  color,
}: Readonly<Props>): ReactNode {
  return (
    <rect
      data-seed-current={destination === "current" ? "" : undefined}
      data-seed-remaining={destination === "remaining" ? "" : undefined}
      data-seed-sown={destination === "sown" ? "" : undefined}
      data-seed-loss={destination === "loss" ? "" : undefined}
      {...position}
      width={width}
      height={12}
      fill={color}
    />
  );
}

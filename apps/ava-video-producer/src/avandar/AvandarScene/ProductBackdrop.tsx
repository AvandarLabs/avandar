import { useVideoProps } from "../../videoTheme/useVideoTheme";
import type { ReactNode } from "react";
/**
 * The product stage's box, painted with `components.ProductFrame.backdrop`
 * behind the product UI.
 */
export function ProductBackdrop({
  width,
  height,
  children,
}: {
  width: number;
  height: number;
  children: ReactNode;
}): ReactNode {
  const { backdrop } = useVideoProps("ProductFrame", {});
  return (
    <div
      style={{
        width,
        height,
        position: "relative",
        background: backdrop,
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

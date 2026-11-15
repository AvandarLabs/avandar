import { useCurrentFrame } from "remotion";
import { StockGraphic } from "./StockGraphic";
import type { StockRequest } from "./contracts/StockContract.types";
import type { ReactNode } from "react";

type Props = StockRequest;

/**
 * Standalone composition picture shares the gallery's validated SVG renderer.
 */
export function StockClip(props: Props): ReactNode {
  return (
    <StockGraphic
      {...props}
      frame={useCurrentFrame()}
      width={1280}
      height={800}
    />
  );
}

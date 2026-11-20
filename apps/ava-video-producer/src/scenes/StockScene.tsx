import { loopPhase } from "../motion";
import { STOCK_LOOP_FRAMES } from "../stock/catalog";
import { StockGraphic } from "../stock/StockGraphic/StockGraphic";
import { useVideoTokens } from "../videoTheme/useVideoTheme";
import { SceneShell } from "./SceneShell";
import type { StockRequest } from "../stock/contracts/StockContract.types";
import type { SceneBase } from "./scenes.types";
import type { ReactNode } from "react";

/** Storyboard heading and frame context around a typed stock request. */
export type Props = SceneBase & StockRequest;

/**
 * Conceptual stock graphics repeat their six-second cycle; authored content is
 * preserved. The graphic sits on the request's background, or the theme's
 * `color.ground`.
 */
export function StockScene({
  frame,
  width = 1600,
  height = 1000,
  title,
  kicker,
  ...request
}: Props): ReactNode {
  const tokens = useVideoTokens();
  const top = title || kicker ? 200 : 0;
  return (
    <SceneShell
      frame={frame}
      width={width}
      height={height}
      title={title}
      kicker={kicker}
    >
      <div
        style={{
          position: "absolute",
          top,
          left: 0,
          width,
          height: height - top,
          background: request.background ?? tokens.color.ground,
        }}
      >
        <StockGraphic
          {...request}
          frame={loopPhase(frame, STOCK_LOOP_FRAMES) * STOCK_LOOP_FRAMES}
          width={width}
          height={height - top}
        />
      </div>
    </SceneShell>
  );
}

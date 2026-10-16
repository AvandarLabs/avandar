import { loopPhase } from "../motion";
import { STOCK_LOOP_FRAMES, type StockPresetId } from "../stock/catalog";
import { StockGraphic } from "../stock/StockGraphic";
import { SceneShell } from "./SceneShell";
import type { SceneBase } from "./scenes.types";

export type Props = SceneBase & {
  preset: StockPresetId;
  accent?: string;
};

/** Conceptual stock graphics repeat their six-second cycle; sample content is fixed. */
export function StockScene({
  preset,
  accent,
  frame,
  width = 1600,
  height = 1000,
  title,
  kicker,
}: Props) {
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
          background: "#0b1219",
        }}
      >
        <StockGraphic
          preset={preset}
          frame={loopPhase(frame, STOCK_LOOP_FRAMES) * STOCK_LOOP_FRAMES}
          width={width}
          height={height - top}
          accent={accent}
        />
      </div>
    </SceneShell>
  );
}

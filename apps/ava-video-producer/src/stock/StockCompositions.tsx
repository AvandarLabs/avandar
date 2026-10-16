import { Composition, useCurrentFrame } from "remotion";
import {
  STOCK_CATALOG,
  STOCK_FPS,
  STOCK_LOOP_FRAMES,
  type StockPresetId,
} from "./catalog";
import { StockGraphic } from "./StockGraphic";

function StockClip({ preset }: { preset: StockPresetId }) {
  return (
    <StockGraphic
      preset={preset}
      frame={useCurrentFrame()}
      width={1280}
      height={800}
    />
  );
}

/** Media-free registration shared by Studio and the isolated stock render entry. */
export function StockCompositions() {
  return (
    <>
      {STOCK_CATALOG.map((entry) => (
        <Composition
          key={entry.id}
          id={`stock-${entry.id}`}
          component={StockClip}
          defaultProps={{ preset: entry.id }}
          durationInFrames={STOCK_LOOP_FRAMES}
          fps={STOCK_FPS}
          width={1280}
          height={800}
        />
      ))}
    </>
  );
}

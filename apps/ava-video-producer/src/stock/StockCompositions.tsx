import { Composition } from "remotion";
import { STOCK_CATALOG, STOCK_FPS, STOCK_LOOP_FRAMES } from "./catalog";
import { stockRequestSchema } from "./contracts/stockRequestSchema/stockRequestSchema";
import { STOCK } from "./graphics-common";
import { StockClip } from "./StockClip";

/** Media-free registration shared by Studio and the isolated stock render entry. */
export function StockCompositions() {
  return (
    <>
      {STOCK_CATALOG.map((entry) => (
        <Composition
          key={entry.id}
          id={`stock-${entry.id}`}
          component={StockClip}
          defaultProps={stockRequestSchema.parse({
            preset: entry.id,
            accent: STOCK.mint,
            background: STOCK.ground,
          })}
          calculateMetadata={({ props }) => ({
            props: stockRequestSchema.parse(props),
          })}
          durationInFrames={STOCK_LOOP_FRAMES}
          fps={STOCK_FPS}
          width={1280}
          height={800}
        />
      ))}
    </>
  );
}

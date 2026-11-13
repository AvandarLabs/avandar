import { Composition } from "remotion";
import { STOCK_CATALOG, STOCK_FPS, STOCK_LOOP_FRAMES } from "./catalog";
import { stockRequestSchema } from "./contracts/stockRequestSchema/stockRequestSchema";
import { StockClip } from "./StockClip";
import type { Props as StockClipProps } from "./StockClip";

/** Media-free registration shared by Studio and the isolated stock render entry. */
export function StockCompositions() {
  return (
    <>
      {STOCK_CATALOG.map((entry) => (
        <Composition
          key={entry.id}
          id={`stock-${entry.id}`}
          component={StockClip}
          defaultProps={stockRequestSchema.parse({ preset: entry.id })}
          calculateMetadata={({ props }) => {
            const { theme, ...request } = props as StockClipProps;
            return {
              props: {
                ...stockRequestSchema.parse(request),
                ...(theme ? { theme } : {}),
              },
            };
          }}
          durationInFrames={STOCK_LOOP_FRAMES}
          fps={STOCK_FPS}
          width={1280}
          height={800}
        />
      ))}
    </>
  );
}

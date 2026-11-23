import { Composition } from "remotion";
import { stockRequestSchema } from "./contracts/stockRequestSchema/stockRequestSchema";
import { StockClip } from "./StockClip";
import { STOCK_CATALOG, STOCK_FPS, STOCK_LOOP_FRAMES } from "./stockEntry";

/**
 * Media-free registration shared by Studio and the isolated stock render
 * entry.
 */
export function StockCompositions(): React.JSX.Element {
  return (
    <>
      {STOCK_CATALOG.map((entry) => {
        return (
          <Composition
            key={entry.id}
            id={`stock-${entry.id}`}
            component={StockClip}
            defaultProps={stockRequestSchema.parse({ preset: entry.id })}
            calculateMetadata={({ props }) => {
              const { theme, ...request } = props;
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
        );
      })}
    </>
  );
}

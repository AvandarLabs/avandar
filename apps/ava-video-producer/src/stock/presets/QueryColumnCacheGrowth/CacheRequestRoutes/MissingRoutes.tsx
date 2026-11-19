import {
  useGraphicProps,
  useGraphicTokens,
} from "../../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

/** Draws the route from the second request to each missing column. */
export function MissingRoutes({
  missingIds,
}: Readonly<{ missingIds: string[] }>): ReactNode {
  const style = useGraphicProps("QueryColumnCacheGrowth", {});
  const { color } = useGraphicTokens();
  return missingIds.map((id, index) => {
    return (
      <path
        key={id}
        data-missing-route={id}
        d={`M700 178 V184 H${139 + index * 168} V191`}
        fill="none"
        stroke={color.highlight}
        strokeWidth={style.routeStrokeWidth}
      />
    );
  });
}

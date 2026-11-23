import { ContinuityScene } from "../../continuity/ContinuityScene";
import { BarComparisonScene } from "../../scenes/BarComparisonScene/BarComparisonScene";
import { BrandLockupScene } from "../../scenes/BrandLockupScene/BrandLockupScene";
import { FlowchartScene } from "../../scenes/FlowchartScene";
import { GraphScene } from "../../scenes/GraphScene";
import { MediaScene } from "../../scenes/MediaScene";
import { MetricScene } from "../../scenes/MetricScene";
import { StockScene } from "../../scenes/StockScene";
import { TiltedWindowScene } from "../../scenes/TiltedWindowScene/TiltedWindowScene";
import { TypographyScene } from "../../scenes/TypographyScene";
import { TitleCard } from "../../title-card";
import type { ProductSegment } from "../../continuity/continuitySchema";
import type { Shot } from "../schema/schema";
import type { ReactNode } from "react";

/** All registered scene inputs are checked by the same storyboard schema. */
export type ProductSceneRenderer = (
  props: Pick<ProductSegment, "feature" | "mode"> & { fromFrame?: number } & {
    frame: number;
    width: number;
    height: number;
  },
) => ReactNode;

/** Renders a single shot by dispatching on its scene kind. */
export function ShotView({
  shot,
  frame,
  width,
  height,
  productScene,
}: {
  shot: Shot;
  frame: number;
  width: number;
  height: number;
  productScene?: ProductSceneRenderer;
}) {
  const common = { frame, width, height };
  switch (shot.scene) {
    case "continuity":
      return (
        <ContinuityScene
          plan={shot.props}
          frame={frame}
          productScene={productScene}
        />
      );
    case "avandar": {
      if (!productScene)
        throw new Error(
          "Avandar scenes require src/avandar-entry.tsx (npm run video selects it automatically)",
        );
      return productScene({ ...shot.props, ...common });
    }
    case "title":
      return <TitleCard {...shot.props} frame={frame} />;
    case "graph":
      return <GraphScene {...shot.props} {...common} />;
    case "flowchart":
      return <FlowchartScene {...shot.props} {...common} />;
    case "metric":
      return <MetricScene {...shot.props} {...common} />;
    case "typography":
      return <TypographyScene {...shot.props} {...common} />;
    case "media":
      return <MediaScene {...shot.props} {...common} />;
    case "stock":
      return <StockScene {...shot.props} {...common} />;
    case "tilted-window":
      return <TiltedWindowScene {...shot.props} {...common} />;
    case "brand-lockup":
      return <BrandLockupScene {...shot.props} {...common} />;
    case "bar-comparison":
      return <BarComparisonScene {...shot.props} {...common} />;
  }
}

import { match } from "ts-pattern";
import { ContinuityScene } from "../../continuity/ContinuityScene/ContinuityScene";
import { BarComparisonScene } from "../../scenes/BarComparisonScene/BarComparisonScene";
import { BrandLockupScene } from "../../scenes/BrandLockupScene/BrandLockupScene";
import { FlowchartScene } from "../../scenes/FlowchartScene";
import { GraphScene } from "../../scenes/GraphScene/GraphScene";
import { MediaScene } from "../../scenes/MediaScene/MediaScene";
import { MetricScene } from "../../scenes/MetricScene/MetricScene";
import { StockScene } from "../../scenes/StockScene";
import { TiltedWindowScene } from "../../scenes/TiltedWindowScene/TiltedWindowScene";
import { TypographyScene } from "../../scenes/TypographyScene/TypographyScene";
import { TitleCard } from "../../TitleCard/TitleCard";
import type { ProductSegment } from "../../continuity/continuitySchema/continuitySchema";
import type { Shot } from "../schema/schema";
import type { ReactNode } from "react";

type Props = {
  shot: Shot;
  frame: number;
  width: number;
  height: number;
  productScene?: ProductSceneRenderer;
};
/** All registered scene inputs are checked by the same storyboard schema. */
export type ProductSceneRenderer = (
  props: Pick<ProductSegment, "feature" | "mode"> & { fromFrame?: number } & {
    frame: number;
    width: number;
    height: number;
  },
) => ReactNode;
/** Renders a single shot by dispatching on its scene kind. */
export function ShotView(options: Readonly<Props>): ReactNode {
  const { shot, frame, width, height, productScene } = options;
  const common = { frame, width, height };
  return match(shot)
    .with({ scene: "continuity" }, { scene: "avandar" }, (matchedShot) => {
      return _getProductSceneFromShot({
        shot: matchedShot,
        ...common,
        productScene,
      });
    })
    .with({ scene: "title" }, (matchedShot) => {
      return <TitleCard {...matchedShot.props} frame={frame} />;
    })
    .with({ scene: "graph" }, (matchedShot) => {
      return <GraphScene {...matchedShot.props} {...common} />;
    })
    .with({ scene: "flowchart" }, (matchedShot) => {
      return <FlowchartScene {...matchedShot.props} {...common} />;
    })
    .with({ scene: "metric" }, (matchedShot) => {
      return <MetricScene {...matchedShot.props} {...common} />;
    })
    .with({ scene: "typography" }, (matchedShot) => {
      return <TypographyScene {...matchedShot.props} {...common} />;
    })
    .with({ scene: "media" }, (matchedShot) => {
      return <MediaScene {...matchedShot.props} {...common} />;
    })
    .with({ scene: "stock" }, (matchedShot) => {
      return <StockScene {...matchedShot.props} {...common} />;
    })
    .with({ scene: "tilted-window" }, (matchedShot) => {
      return <TiltedWindowScene {...matchedShot.props} {...common} />;
    })
    .with({ scene: "brand-lockup" }, (matchedShot) => {
      return <BrandLockupScene {...matchedShot.props} {...common} />;
    })
    .with({ scene: "bar-comparison" }, (matchedShot) => {
      return <BarComparisonScene {...matchedShot.props} {...common} />;
    })
    .exhaustive();
}

function _getProductSceneFromShot({
  shot,
  frame,
  width,
  height,
  productScene,
}: Readonly<
  Omit<Props, "shot"> & {
    shot: Extract<Shot, { scene: "continuity" | "avandar" }>;
  }
>): ReactNode {
  const common = { frame, width, height };
  return match(shot)
    .with({ scene: "continuity" }, (matchedShot) => {
      return (
        <ContinuityScene
          plan={matchedShot.props}
          frame={frame}
          productScene={productScene}
        />
      );
    })
    .with({ scene: "avandar" }, (matchedShot) => {
      if (!productScene) {
        throw new Error(
          "Avandar scenes require src/avandar-entry.tsx (npm run video selects it automatically)",
        );
      }
      return productScene({ ...matchedShot.props, ...common });
    })
    .exhaustive();
}

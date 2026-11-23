import { match } from "ts-pattern";
import { ContinuityCameraGraphic } from "../camera/ContinuityCameraGraphic";
import { ContinuityComposite } from "../ContinuityComposite/ContinuityComposite";
import { ContinuityThesis } from "../ContinuityThesis/ContinuityThesis";
import css from "./ContinuityContent.module.css";
import { ContinuityProductContent } from "./ContinuityProductContent/ContinuityProductContent";
import type { ProductSceneRenderer } from "../../storyboard/StoryFilm/ShotView";
import type { ContinuityBeat } from "../continuitySchema/continuitySchema";
import type { ReactNode } from "react";

type Props = {
  content: ContinuityBeat["content"];
  frame: number;
  accent: string;
  productScene?: ProductSceneRenderer;
};
/** Exhaustive content renderer with an explicit product-bridge requirement. */
export function ContinuityContent({
  content,
  frame,
  accent,
  productScene,
}: Readonly<Props>): ReactNode {
  return match(content)
    .with({ kind: "stock" }, (matchedContent) => {
      return (
        <div className={css.continuityContentGraphic}>
          <ContinuityCameraGraphic content={matchedContent} />
        </div>
      );
    })
    .with({ kind: "thesis" }, (matchedContent) => {
      return (
        <ContinuityThesis
          content={matchedContent}
          frame={frame}
          accent={accent}
        />
      );
    })
    .with({ kind: "composite" }, (matchedContent) => {
      return (
        <ContinuityComposite
          content={matchedContent}
          frame={frame}
          accent={accent}
          productScene={productScene}
        />
      );
    })
    .with({ kind: "product" }, (matchedContent) => {
      return (
        <ContinuityProductContent
          content={matchedContent}
          frame={frame}
          accent={accent}
          productScene={productScene}
        />
      );
    })
    .exhaustive();
}

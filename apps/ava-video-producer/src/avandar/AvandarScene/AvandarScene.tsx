import { prop } from "@avandar/utils";
import { Cursor } from "../../chrome/chrome";
import { useCursorMotion } from "../../chrome/useCursorMotion";
import {
  type CursorKind,
  CursorMotionHelpers,
} from "../../CursorMotionHelpers";
import targets from "../cursor-targets.json";
import "../generated/product.css";
import { AvandarStage } from "../generated/product";
import { measuredPath } from "../measuredPath";
import css from "./AvandarScene.module.css";
import { ProductBackdrop } from "./ProductBackdrop";
import type { ProductSceneRenderer } from "../../storyboard/StoryFilm/StoryFilm";
import type { ReactNode } from "react";
// End-of-typing holds from the adapters' typed() intervals, in full feature
// frames.
const TEXT_HOLDS: Record<string, number> = {
  "import-name": 166,
  "import-description": 312,
  "explorer-filter-value": 190,
  "explorer-sql-editor": 540,
  "dashboard-name": 208,
  "mapping-manual-name": 442,
};
/** The props every product scene renderer receives from `ShotView`. */
type Props = Parameters<ProductSceneRenderer>[0];
type MeasuredBeat = {
  frame: number;
  target: string;
  action: string;
  x: number;
  y: number;
};
/**
 * Pointer paths use measured rendered targets, with a hold through each click.
 */
export function AvandarScene({
  feature,
  frame,
  fromFrame = 0,
  mode = "full",
  width,
  height,
}: Props): ReactNode {
  const productFrame = frame + fromFrame;
  const cursorMotion = useCursorMotion();
  const beats = _getMeasuredBeatsFromFeature({ feature, mode });
  const { keys, clicks } = _getCursorTimelineFromBeats({
    beats,
    width,
    height,
  });
  const cursor = CursorMotionHelpers.cursorOnTarget({
    frame: productFrame,
    path: keys,
    targets: beats,
    motion: cursorMotion,
  });
  return (
    <ProductBackdrop width={width} height={height}>
      <AvandarStage
        feature={feature}
        frame={productFrame}
        width={width}
        height={height}
        mode={mode}
      />
      <div className={css.avandarScenediv1}>
        {beats.length > 0 && (
          <Cursor
            frame={productFrame}
            path={keys}
            clicks={clicks}
            cursor={cursor}
          />
        )}
      </div>
    </ProductBackdrop>
  );
}

type CursorBeat = MeasuredBeat & { holdUntil: number; cursor: CursorKind };
/** Selects measured feature beats and preserves authored typing holds. */
function _getMeasuredBeatsFromFeature({
  feature,
  mode,
}: Readonly<Pick<Props, "feature" | "mode">>): CursorBeat[] {
  const offset = mode === "query" ? 290 : mode === "chart" ? 570 : 0;
  const byFeature: Partial<Record<string, MeasuredBeat[]>> = targets;
  return (byFeature[feature] ?? [])
    .filter((b) => {
      return (
        mode === "full" ||
        (mode === "filter" && b.frame < 300) ||
        (mode === "query" && b.frame >= 300 && b.frame < 620) ||
        (mode === "chart" && b.frame >= 620)
      );
    })
    .map((b): CursorBeat => {
      return {
        ...b,
        frame: b.frame - offset,
        holdUntil: (TEXT_HOLDS[b.target] ?? 0) - offset,
        cursor:
          b.target in TEXT_HOLDS
            ? "text"
            : b.action === "click"
              ? "pointer"
              : "default",
      };
    });
}
/** Derives held pointer keys and click frames from measured beats. */
function _getCursorTimelineFromBeats({
  beats,
  width,
  height,
}: Readonly<{ beats: CursorBeat[]; width: number; height: number }>): {
  keys: ReturnType<typeof measuredPath>;
  clicks: number[];
} {
  const keys = beats.length
    ? measuredPath({
        beats,
        width,
        height,
      })
    : [{ at: 0, x: 0, y: 0 }];
  const clicks = beats
    .filter((b) => {
      return b.action === "click" || b.action === "select";
    })
    .map(prop("frame"));

  return { keys, clicks };
}

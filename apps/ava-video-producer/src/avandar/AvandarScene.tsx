import { Cursor } from "../chrome/chrome";
import "./generated/product.css";
import { cursorOnTarget, type CursorKind } from "../cursor-motion";
import { measuredPath } from "./choreography";
import targets from "./cursor-targets.json";
import { AvandarStage } from "./generated/product.js";
import type { ProductSceneRenderer } from "../storyboard/StoryFilm/StoryFilm";

// End-of-typing holds from the adapters' typed() intervals, in full feature frames.
const TEXT_HOLDS: Record<string, number> = {
  "import-name": 166,
  "import-description": 312,
  "explorer-filter-value": 190,
  "explorer-sql-editor": 540,
  "dashboard-name": 208,
  "mapping-manual-name": 442,
};

type MeasuredBeat = {
  frame: number;
  target: string;
  action: string;
  x: number;
  y: number;
};

/** Pointer paths use measured rendered targets, with a hold through each click. */
export const AvandarScene: ProductSceneRenderer = ({
  feature,
  frame,
  fromFrame = 0,
  mode = "full",
  width,
  height,
}) => {
  const productFrame = frame + fromFrame;
  const offset = mode === "query" ? 290 : mode === "chart" ? 570 : 0;
  const beats = (
    (targets as Partial<Record<string, MeasuredBeat[]>>)[feature] ?? []
  )
    .filter(
      (b) =>
        mode === "full" ||
        (mode === "filter" && b.frame < 300) ||
        (mode === "query" && b.frame >= 300 && b.frame < 620) ||
        (mode === "chart" && b.frame >= 620),
    )
    .map((b) => ({
      ...b,
      frame: b.frame - offset,
      holdUntil: (TEXT_HOLDS[b.target] ?? 0) - offset,
      cursor: (b.target in TEXT_HOLDS
        ? "text"
        : b.action === "click"
          ? "pointer"
          : "default") as CursorKind,
    }));
  const keys = beats.length
    ? measuredPath(beats, width, height)
    : [{ at: 0, x: 0, y: 0 }];
  const clicks = beats
    .filter((b) => b.action === "click" || b.action === "select")
    .map((b) => b.frame);
  const cursor = cursorOnTarget(productFrame, keys, beats);
  return (
    <div
      style={{
        width,
        height,
        position: "relative",
        background: "#eaeef2",
        overflow: "hidden",
      }}
    >
      <AvandarStage
        feature={feature}
        frame={productFrame}
        width={width}
        height={height}
        mode={mode}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 10000,
          pointerEvents: "none",
        }}
      >
        {beats.length > 0 && (
          <Cursor
            frame={productFrame}
            path={keys}
            clicks={clicks}
            cursor={cursor}
          />
        )}
      </div>
    </div>
  );
};

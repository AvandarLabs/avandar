import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { z } from "zod";
import {
  storyboardSchema,
  durationInFrames,
} from "../../../src/storyboard/schema/schema";
import type { Film } from "../../../src/showcase/showcase.types";

/** App location derived from this module, independent of the shell directory. */
export const appRoot = fileURLToPath(new URL("../../../", import.meta.url));
/** Only these authored plans may be served or rendered by the showcase. */
export const plans: Record<string, string> = {
  "avandar-home": "home",
  "scene-library": "library",
  "avandar-overview": "avandar-overview",
  "avandar-import": "import",
  "avandar-explorer": "explorer",
  "avandar-dashboards": "dashboards",
  "avandar-cases": "cases",
  "avandar-map": "map",
};
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const optionsSchema = z
  .object({
    captions: z.boolean().optional(),
    accent: color.optional(),
    background: color.optional(),
  })
  .strict();

async function _sourceModuleUrl(relative: string) {
  const filename = path.join(appRoot, relative);
  const hash = createHash("sha256")
    .update(await fs.readFile(filename))
    .digest("hex");
  const url = pathToFileURL(filename);
  url.searchParams.set("source", hash);
  return url.href;
}

/** Read current authored inputs and reject unknown IDs or unsupported options. */
export async function loadFilm(
  id: string,
  rawOptions: unknown = {},
): Promise<Film> {
  const options = optionsSchema.parse(rawOptions);
  const {
    STOCK_CATALOG,
    STOCK_FPS,
  }: typeof import("../../../src/stock/catalog") = await import(
    await _sourceModuleUrl("src/stock/catalog.ts")
  );
  const stock = STOCK_CATALOG.find((entry) => `stock-${entry.id}` === id);
  if (!stock && (options.accent || options.background)) {
    throw new Error("Palette options require an Atlas preset");
  }
  const base = {
    id,
    fps: 30,
    width: 1600,
    height: 1000,
    delivery: { width: 1536, height: 960 },
    loop: true,
    showCaptions: options.captions ?? true,
  };
  if (stock) {
    return {
      ...base,
      kind: "stock",
      preset: stock.id,
      frames: stock.loopFrames,
      fps: STOCK_FPS,
      width: 1280,
      height: 800,
      delivery: { width: 1280, height: 800 },
      source: "apps/ava-video-producer/src/stock/StockGraphic.tsx",
      accent: options.accent,
      background: options.background,
    };
  }
  if (id === "title-study" || id === "motion-lab") {
    const timing: typeof import("../../../src/composition-timing") =
      await import(await _sourceModuleUrl("src/composition-timing.ts"));
    return {
      ...base,
      kind: id,
      frames:
        id === "title-study"
          ? timing.TITLE_STUDY_LEN
          : timing.MOTION_LAB_LEN + timing.TITLE_LEN,
      source: `apps/ava-video-producer/src/compositions/${id === "title-study" ? "TitleStudy" : "MotionLab"}.tsx`,
    };
  }
  if (!Object.hasOwn(plans, id)) {
    throw new Error("Unknown showcase film");
  }
  const source = `storyboards/${plans[id]}.json`;
  const plan = storyboardSchema.parse(
    JSON.parse(await fs.readFile(path.join(appRoot, source), "utf8")),
  );
  return {
    ...base,
    kind: "storyboard",
    plan,
    frames: durationInFrames(plan),
    fps: plan.fps,
    width: plan.width,
    height: plan.height,
    delivery: plan.delivery,
    loop: plan.purpose === "loop",
    source: `apps/ava-video-producer/${source}`,
  };
}

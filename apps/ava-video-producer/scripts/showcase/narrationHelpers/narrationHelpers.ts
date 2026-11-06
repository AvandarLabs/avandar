import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  storyboardSchema,
  type Storyboard,
} from "../../../src/storyboard/schema/schema";
import { assetReferences, publicAsset } from "../../lib/planHelpers";
import { scratchTts } from "../../video";
import { appRoot, PLANS } from "../ShowcaseFilms/ShowcaseFilms";
import type { Film } from "../../../src/showcase/showcase.types";

type NarrationOptions = {
  root?: string;
  platform?: NodeJS.Platform;
  synthesize?: typeof scratchTts;
};

async function _prepareNarration(
  film: Film,
  root: string,
  key: string,
  synthesize: typeof scratchTts,
): Promise<Storyboard> {
  const cache = path.join(root, "out/showcase/narration", `${key}.json`);
  try {
    const plan = storyboardSchema.parse(
      JSON.parse(await fs.readFile(cache, "utf8")),
    );
    await Promise.all(
      assetReferences(plan).map((asset) => publicAsset(root, asset)),
    );
    return plan;
  } catch {
    /* A missing speech cache is regenerated from its authored cues. */
  }
  const relativeDirectory = `out/showcase/narration/stages/${key}-${randomUUID()}`;
  const filename = await synthesize(
    film.plan!,
    {
      filename: path.join(root, "storyboards", `${PLANS[film.id]}.json`),
      voice: "Samantha",
      rate: 170,
    },
    root,
    relativeDirectory,
  );
  const plan = storyboardSchema.parse(
    JSON.parse(await fs.readFile(filename, "utf8")),
  );
  await fs.mkdir(path.dirname(cache), { recursive: true });
  await fs.writeFile(cache, JSON.stringify(plan));
  return plan;
}

/** Cache captured narration separately from each viewer's playback options. */
export function createNarrationLoader({
  root = appRoot,
  platform = process.platform,
  synthesize = scratchTts,
}: NarrationOptions = {}) {
  const pending = new Map<string, Promise<Storyboard>>();
  return async (film: Film): Promise<Film> => {
    if (
      !film.plan?.narration.length ||
      film.id === "avandar-home" ||
      platform !== "darwin"
    ) {
      return film;
    }
    const plan = structuredClone(film.plan);
    const key = createHash("sha256").update(JSON.stringify(plan)).digest("hex");
    let result = pending.get(key);
    if (!result) {
      result = _prepareNarration(
        { ...film, plan },
        root,
        key,
        synthesize,
      ).catch((error) => {
        pending.delete(key);
        throw error;
      });
      pending.set(key, result);
    }
    return { ...film, plan: await result };
  };
}

/** Add cached local scratch speech while preserving viewer options. */
export const withNarration = createNarrationLoader();

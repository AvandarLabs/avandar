import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { z } from "zod";
import { createContinuityPlanFromOptions } from "../../../src/continuity/continuityAppearance";
import { CONTINUITY_CATALOG } from "../../../src/continuity/continuityCatalog";
import { createContinuityPlanFromVideoThemeSnapshot } from "../../../src/continuity/createContinuityPlanFromVideoTheme/createContinuityPlanFromVideoTheme";
import {
  getHelperFromFilmId,
  HELPER_CANVAS,
} from "../../../src/gallery/HelperGallery/helperCatalog";
import {
  storyboardSchema,
  durationInFrames,
} from "../../../src/storyboard/schema/schema";
import {
  VIDEO_THEME_SLUG_PATTERN,
  videoThemePatchSchema,
} from "../../../src/videoTheme/videoThemeSchemaHelpers/videoThemeSchemaHelpers";
import {
  buildStockContracts,
  type StockContractGeneration,
} from "../../stock/buildStockContracts/buildStockContracts";
import {
  type StockFingerprint,
  StockFingerprintModule,
} from "../../stock/StockFingerprintModule/StockFingerprintModule";
import { loadVideoThemeSnapshot } from "../../videoTheme/loadVideoThemeSnapshot/loadVideoThemeSnapshot";
import type { Film } from "../../../src/showcase/showcase.types";

/**
 * App location derived from this module, independent of the shell directory.
 */
export const appRoot: string = fileURLToPath(
  new URL("../../../", import.meta.url),
);
/** Only these authored plans may be served or rendered by the showcase. */
export const PLANS: Record<string, string> = {
  ...Object.fromEntries(
    CONTINUITY_CATALOG.map((entry) => {
      return [entry.id, entry.path];
    }),
  ),
  "avandar-home": "home",
  "scene-library": "library",
  "shot-vocabulary": "shot-vocabulary",
  "avandar-overview": "avandar-overview",
  "avandar-import": "import",
  "avandar-explorer": "explorer",
  "avandar-dashboards": "dashboards",
  "avandar-cases": "cases",
  "avandar-map": "map",
};
const stockGenerations: WeakMap<Film, StockContractGeneration> = new WeakMap<
  Film,
  StockContractGeneration
>();

/**
 * Retain the exact validators and defaults until an active export completes.
 */
function _retainFilmContracts(film: Readonly<Film>): () => Promise<void> {
  return stockGenerations.get(film)?.retain() ?? (async () => {});
}

/** Bind a frozen stock film to the exact sources that validated its content. */
async function _fingerprintStockFilm(
  film: Readonly<Film>,
): Promise<StockFingerprint> {
  const generation = stockGenerations.get(film);
  if (!generation) {
    throw new Error("Stock film requires a loaded contract generation");
  }
  return StockFingerprintModule.fromRequest({
    root: appRoot,
    request: film,
    expectedSourceHash: generation.sourceHash,
  });
}

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/) satisfies z.ZodType;
const optionsSchema = z.strictObject({
  captions: z.boolean().optional(),
  cameraMotion: z.boolean().optional(),
  motionBlur: z.boolean().optional(),
  annotations: z.boolean().optional(),
  schemaVersion: z.literal(1).optional(),
  input: z.unknown().optional(),
  accent: color.optional(),
  background: color.optional(),
  theme: z
    .strictObject({
      id: z.string().regex(VIDEO_THEME_SLUG_PATTERN),
      patch: videoThemePatchSchema.optional(),
    })
    .optional(),
}) satisfies z.ZodType;

function _freezeSnapshot<Value>(value: Value): Value {
  if (value && typeof value === "object") {
    Object.values(value).forEach((child) => {
      return _freezeSnapshot(child);
    });
    Object.freeze(value);
  }
  return value;
}

async function _sourceModuleUrl(relative: string) {
  const filename = path.join(appRoot, relative);
  const hash = createHash("sha256")
    .update(await fs.readFile(filename))
    .digest("hex");
  const url = pathToFileURL(filename);
  url.searchParams.set("source", hash);
  return url.href;
}

/** A helper preview at the Atlas canvas size. It accepts no options. */
function _loadHelperFilm(id: string, options: object): Film | undefined {
  const helper = getHelperFromFilmId(id);
  if (!helper) {
    return undefined;
  }
  if (Object.keys(options).length > 0) {
    throw new Error("Helper previews accept no options");
  }
  return {
    id,
    kind: "helper",
    helper: helper.id,
    assets: helper.demo.assets ?? [],
    source: `apps/ava-video-producer/${helper.source}`,
    frames: helper.demo.frames,
    fps: 30,
    ...HELPER_CANVAS,
    delivery: HELPER_CANVAS,
    loop: true,
    showCaptions: false,
  };
}

/** Helper previews play live in the gallery and are never rendered to MP4. */
function _assertExportable(film: Readonly<Film>): void {
  if (film.kind === "helper") {
    throw new Error("Helper previews play live only");
  }
}

/**
 * The options a continuity film's shots take. Colours, sketch roughness, and
 * the camera preset are theme tokens, so they reach the film through `theme`.
 */
function _renderOptions(
  options: z.infer<typeof optionsSchema>,
): Record<string, boolean> {
  const { captions, cameraMotion, motionBlur, annotations } = options;
  return Object.fromEntries(
    Object.entries({ captions, cameraMotion, motionBlur, annotations }).filter(
      (entry): entry is [string, boolean] => {
        return entry[1] !== undefined;
      },
    ),
  );
}

type FilmOptions = z.infer<typeof optionsSchema>;

/** The fields every film shares, with the theme the film renders in. */
async function _loadBaseFilm({
  id,
  options,
}: Readonly<{ id: string; options: FilmOptions }>) {
  return {
    theme: await loadVideoThemeSnapshot(options.theme ?? { id: "classic" }),
    id,
    fps: 30,
    width: 1600,
    height: 1000,
    delivery: { width: 1536, height: 960 },
    loop: true,
    showCaptions: options.captions ?? true,
  };
}

type BaseFilm = Awaited<ReturnType<typeof _loadBaseFilm>>;

/** Refuses options the film's kind does not take. */
function _assertOptionsFit({
  options,
  isStock,
  isContinuity,
}: Readonly<{
  options: FilmOptions;
  isStock: boolean;
  isContinuity: boolean;
}>): void {
  if (
    !isStock &&
    !isContinuity &&
    Object.keys(options).some((key) => {
      return key !== "captions" && key !== "theme";
    })
  ) {
    throw new Error("Stock options require an Atlas preset");
  }
  if (
    isContinuity &&
    (options.input !== undefined ||
      options.schemaVersion !== undefined ||
      options.accent !== undefined ||
      options.background !== undefined)
  )
    throw new Error(
      "Continuity input and colours come from the storyboard and theme",
    );
}

/** A stock film bound to the contract generation that validated its content. */
function _loadStockFilm({
  base,
  stock,
  contracts,
  options,
}: Readonly<{
  base: BaseFilm;
  stock: StockContractGeneration["STOCK_CATALOG"][number];
  contracts: StockContractGeneration;
  options: FilmOptions;
}>): Film {
  const { STOCK_FPS, stockRequestSchema } = contracts;
  const film: Film = _freezeSnapshot({
    ...base,
    kind: "stock",
    ...stockRequestSchema.parse({
      preset: stock.id,
      ...Object.fromEntries(
        Object.entries(options).filter(([key, value]) => {
          return key !== "captions" && key !== "theme" && value !== undefined;
        }),
      ),
    }),
    frames: stock.loopFrames,
    fps: STOCK_FPS,
    width: 1280,
    height: 800,
    delivery: { width: 1280, height: 800 },
    source: "apps/ava-video-producer/src/stock/StockGraphic/StockGraphic.tsx",
  });
  stockGenerations.set(film, contracts);
  return film;
}

/** The title study or the motion lab, sized from the current composition timing. */
async function _loadCompositionFilm({
  base,
  id,
}: Readonly<{
  base: BaseFilm;
  id: "title-study" | "motion-lab";
}>): Promise<Film> {
  const timing: typeof import("../../../src/composition-timing") = await import(
    await _sourceModuleUrl("src/composition-timing.ts")
  );
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

/** A storyboard film, with a continuity film's options applied to its shots. */
async function _loadStoryboardFilm({
  base,
  id,
  options,
  isContinuity,
}: Readonly<{
  base: BaseFilm;
  id: string;
  options: FilmOptions;
  isContinuity: boolean;
}>): Promise<Film> {
  if (!Object.hasOwn(PLANS, id)) {
    throw new Error("Unknown showcase film");
  }
  const source = `storyboards/${PLANS[id]}.json`;
  const plan = storyboardSchema.parse(
    JSON.parse(await fs.readFile(path.join(appRoot, source), "utf8")),
  );
  const configuredPlan = isContinuity
    ? createContinuityPlanFromOptions(plan, _renderOptions(options))
    : plan;
  return {
    ...base,
    kind: "storyboard",
    plan: configuredPlan,
    // The film keeps the authored plan; FilmComposition applies the theme,
    // whose camera preset can lengthen beats.
    frames: durationInFrames(
      createContinuityPlanFromVideoThemeSnapshot(configuredPlan, base.theme, [
        id,
      ]),
    ),
    fps: plan.fps,
    width: plan.width,
    height: plan.height,
    delivery: plan.delivery,
    loop: plan.purpose === "loop",
    source: `apps/ava-video-producer/${source}`,
  };
}

/**
 * Read current authored inputs and reject unknown IDs or unsupported options.
 */
async function _loadFilm(id: string, rawOptions: unknown = {}): Promise<Film> {
  const options = optionsSchema.parse(rawOptions);
  const helperFilm = _loadHelperFilm(id, options);
  if (helperFilm) {
    return helperFilm;
  }
  const contracts = await buildStockContracts(appRoot);
  const stock = contracts.STOCK_CATALOG.find((entry) => {
    return `stock-${entry.id}` === id;
  });
  const isContinuity = CONTINUITY_CATALOG.some((entry) => {
    return entry.id === id;
  });
  _assertOptionsFit({ options, isStock: Boolean(stock), isContinuity });
  const base = await _loadBaseFilm({ id, options });
  if (stock) {
    return _loadStockFilm({ base, stock, contracts, options });
  }
  if (id === "title-study" || id === "motion-lab") {
    return _loadCompositionFilm({ base, id });
  }
  return _loadStoryboardFilm({ base, id, options, isContinuity });
}

/** Related ShowcaseFilms operations. */
export const ShowcaseFilms = {
  /**
   * Read current authored inputs and reject unknown IDs or unsupported options.
   */
  load: _loadFilm,
  /**
   * Retain the exact validators and defaults until an active export completes.
   */
  retainContracts: _retainFilmContracts,
  /**
   * Bind a frozen stock film to the exact sources that validated its content.
   */
  getFingerprintFromFilm: _fingerprintStockFilm,
  /** Helper previews play live in the gallery and are never rendered to MP4. */
  assertExportable: _assertExportable,
} satisfies {
  load: typeof _loadFilm;
  retainContracts: typeof _retainFilmContracts;
  getFingerprintFromFilm: typeof _fingerprintStockFilm;
  assertExportable: typeof _assertExportable;
};

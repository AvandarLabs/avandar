import { propEq, prop } from "@avandar/utils";
import { CONTINUITY_CATALOG } from "../../../../src/continuity/continuityCatalog";
import {
  DEFAULT_ACCENT,
  DEFAULT_BACKGROUND,
} from "../../../../src/gallery/palette";
import { STOCK_IDS } from "../../../../src/stock/catalog";
import { getPreviewFramesFromPlan } from "../../../lib/planHelpers/getPreviewFramesFromPlan";
import { StockFingerprintModule } from "../../../stock/StockFingerprintModule/StockFingerprintModule";
import type { Film } from "../../../../src/showcase/showcase.types";
import type { ParityRegion } from "../compareRgbaFrames/compareRgbaFrames";
/** The stock presets the design tokens cover, in Atlas order. */
const PARITY_STOCK_PRESET_IDS = [
  "network-graph",
  "node-traversal",
  "radial-network",
  "plexus-field",
  "orbital-system",
  "data-pipeline",
  "predicate-pushdown-boundary",
  "code-focus",
  "schema-mapping",
  "query-column-cache-growth",
  "source-merge",
  "decision-fork",
] as const;
/** The compositions the design tokens cover, in Atlas order. */
const PARITY_COMPOSITION_IDS = [
  "shared-object-handoff",
  "frame-to-interface",
  "aperture-detail",
  "spatial-continuation",
  "occlusion-wipe",
] as const;
/** One item the parity gate renders, and the film options it loads with. */
export type ParityTarget = Readonly<{
  id: string;
  filmId: string;
  options: Readonly<Record<string, unknown>>;
}>;
/**
 * A deliberate `classic` change: where it may alter pixels, in design units.
 */
type ParityAllowance = Readonly<{
  id: string;
  reason: string;
  region: ParityRegion;
}>;
const STOCK_VIEWBOX_WIDTH = 960;
const CAPTION_BAND: ParityRegion = { x: 0, y: 520, width: 960, height: 70 };
const CAPTION_REASON = "Shared caption style: 17 px at baseline 551";
/**
 * The only pixel differences `classic` may show against the reference frames
 * captured before renderers read tokens, each a deliberate rounding of an old
 * literal. Regions are in the stock viewBox (960 × 600).
 */
const PARITY_ALLOWANCES: readonly ParityAllowance[] = [
  { id: "radial-network", reason: CAPTION_REASON, region: CAPTION_BAND },
  { id: "node-traversal", reason: CAPTION_REASON, region: CAPTION_BAND },
  { id: "orbital-system", reason: CAPTION_REASON, region: CAPTION_BAND },
  {
    id: "radial-network",
    reason: "Hub glow opacity 0.035 becomes 0.03",
    region: { x: 420, y: 235, width: 120, height: 120 },
  },
  {
    id: "orbital-system",
    reason: "Centre pulse opacity 0.025 becomes 0.03",
    region: { x: 402, y: 220, width: 156, height: 156 },
  },
];
/** Compositions with a showcase film besides the storyboard catalog. */
const FIXED_COMPOSITION_IDS = ["title-study", "motion-lab"];
/**
 * The target for any Atlas motion or composition id, or undefined for an id
 * the Atlas does not have. Stock presets load at the Atlas gallery default
 * colours. Compositions load with their authored values.
 */
function _createTargetFromId(id: string): ParityTarget | undefined {
  if ((STOCK_IDS as readonly string[]).includes(id)) {
    return {
      id,
      filmId: `stock-${id}`,
      options: { accent: DEFAULT_ACCENT, background: DEFAULT_BACKGROUND },
    };
  }
  const isComposition =
    FIXED_COMPOSITION_IDS.includes(id) ||
    CONTINUITY_CATALOG.some(propEq("id", id));
  return isComposition ? { id, filmId: id, options: {} } : undefined;
}
/**
 * How far a pixel of a composition may move, by Atlas id, against reference
 * frames drawn with the starter palette's `oklch()` values from `theme.css`.
 * `VideoThemeProvider` emits that palette as hex measured from rendered
 * frames: solid fills match exactly, but an anti-aliased edge is blended from
 * the unrounded colour. Edges differ by one level, and by up to three where
 * the out-of-gamut `--brand` meets a light ground. Anything larger is a
 * failure. References drawn with the hex palette need no allowance, so only
 * these ids have one.
 */
const STARTER_HEX_ROUNDING: Readonly<Record<string, number>> = {
  "shared-object-handoff": 1,
  "frame-to-interface": 1,
  "aperture-detail": 1,
  "spatial-continuation": 1,
  "occlusion-wipe": 1,
  "brand-lockup": 1,
  "typography-reveals": 1,
  "field-colour-cut": 1,
  "tilted-window": 3,
  "bar-comparison": 3,
  "heading-wipe": 3,
};
function _createTargetsFromIds(ids: readonly string[]): ParityTarget[] {
  const targets = ids.map((id) => {
    return { id, target: _createTargetFromId(id) };
  });
  const unknownIds = targets.flatMap(({ id, target }) => {
    return target ? [] : [id];
  });
  if (unknownIds.length > 0) {
    throw new Error(`Unknown parity target: ${unknownIds.join(", ")}`);
  }
  return targets.flatMap(({ target }) => {
    return target ? [target] : [];
  });
}
/**
 * Parity targets for the named ids, or by default the fast base list: the
 * presets and compositions the design tokens first covered, in Atlas order.
 * Any Atlas id may be named. `listAllParityTargets` covers every item.
 */
function _listParityTargets(ids: readonly string[] = []): ParityTarget[] {
  return _createTargetsFromIds(
    ids.length ? ids : [...PARITY_STOCK_PRESET_IDS, ...PARITY_COMPOSITION_IDS],
  );
}
/**
 * Every Atlas item the parity gate can render: all stock presets, every
 * composition and sample film, and the two fixed films. `pnpm theme:parity
 * <capture|compare> --all` runs them; it takes far longer than the default
 * list, so run it before a release or after a change to shared theme code.
 */
function _listAllParityTargets(): ParityTarget[] {
  return _createTargetsFromIds([
    ...STOCK_IDS,
    ...CONTINUITY_CATALOG.map(prop("id")),
    ...FIXED_COMPOSITION_IDS,
  ]);
}
/**
 * The frames the parity gate compares: the stock fingerprint samples for a
 * preset, and the storyboard preview frames for a composition.
 */
function _getParityFramesFromFilm(film: Pick<Film, "kind" | "plan">): number[] {
  if (film.kind === "stock") {
    return StockFingerprintModule.SAMPLE_PARAMETERS.samples;
  }
  return film.plan ? getPreviewFramesFromPlan(film.plan) : [0];
}
/**
 * Allowed regions for one target, scaled from design units to the rendered
 * frame and rounded outward so a scaled edge never clips a changed pixel.
 */
function _getAllowedRegionsFromFilm({
  id,
  film,
}: Readonly<{
  id: string;
  film: Pick<Film, "kind" | "width" | "height">;
}>): ParityRegion[] {
  const scale = film.kind === "stock" ? film.width / STOCK_VIEWBOX_WIDTH : 1;
  const regions = PARITY_ALLOWANCES.filter((allowance) => {
    return allowance.id === id;
  }).map(({ region }) => {
    return {
      x: Math.floor(region.x * scale),
      y: Math.floor(region.y * scale),
      width: Math.ceil(region.width * scale),
      height: Math.ceil(region.height * scale),
    };
  });
  const starterRounding = STARTER_HEX_ROUNDING[id];
  return starterRounding === undefined
    ? regions
    : [
        ...regions,
        {
          x: 0,
          y: 0,
          width: film.width,
          height: film.height,
          maxChannelDelta: starterRounding,
        },
      ];
}
/** Selects Atlas parity samples and permitted pixel-difference regions. */
export const ParityTargets = {
  /**
   * Parity targets for the named ids, or by default the fast base list: the
   * presets and compositions the design tokens first covered, in Atlas order.
   * Any Atlas id may be named. `listAllParityTargets` covers every item.
   */
  listParityTargets: _listParityTargets,
  /**
   * Every Atlas item the parity gate can render: all stock presets, every
   * composition and sample film, and the two fixed films. `pnpm theme:parity
   * <capture|compare> --all` runs them; it takes far longer than the default
   * list, so run it before a release or after a change to shared theme code.
   */
  listAllParityTargets: _listAllParityTargets,
  /**
   * The frames the parity gate compares: the stock fingerprint samples for a
   * preset, and the storyboard preview frames for a composition.
   */
  getParityFramesFromFilm: _getParityFramesFromFilm,
  /**
   * Allowed regions for one target, scaled from design units to the rendered
   * frame and rounded outward so a scaled edge never clips a changed pixel.
   */
  getAllowedRegionsFromFilm: _getAllowedRegionsFromFilm,
  /** The stock presets the design tokens cover, in Atlas order. */
  PARITY_STOCK_PRESET_IDS,
  /** The compositions the design tokens cover, in Atlas order. */
  PARITY_COMPOSITION_IDS,
};

import { CONTINUITY_CATALOG } from "../../../../src/continuity/continuityCatalog";
import {
  DEFAULT_ACCENT,
  DEFAULT_BACKGROUND,
} from "../../../../src/gallery/palette";
import { STOCK_IDS } from "../../../../src/stock/catalog";
import { previewFrames } from "../../../lib/planHelpers";
import { StockFingerprintModule } from "../../../stock/StockFingerprintModule/StockFingerprintModule";
import { getCoveredIdsFromBudgets } from "../../themeLiteralBudgets/themeLiteralBudgets";
import type { Film } from "../../../../src/showcase/showcase.types";
import type { ParityRegion } from "../compareRgbaFrames/compareRgbaFrames";

/** The stock presets the design tokens cover, in Atlas order. */
export const PARITY_STOCK_PRESET_IDS = [
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
export const PARITY_COMPOSITION_IDS = [
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
    CONTINUITY_CATALOG.some((entry) => {
      return entry.id === id;
    });
  return isComposition ? { id, filmId: id, options: {} } : undefined;
}

/**
 * Parity targets for the named ids, or by default every in-scope item: the
 * presets and compositions the design tokens cover first, in Atlas order,
 * then the items each slice budget lists as covered. Any Atlas id may be
 * named, so a slice can capture its items before it migrates them.
 */
export function listParityTargets(ids: readonly string[] = []): ParityTarget[] {
  const requestedIds = ids.length
    ? ids
    : [
        ...new Set([
          ...PARITY_STOCK_PRESET_IDS,
          ...PARITY_COMPOSITION_IDS,
          ...getCoveredIdsFromBudgets(),
        ]),
      ];
  const targets = requestedIds.map((id) => {
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
 * The frames the parity gate compares: the stock fingerprint samples for a
 * preset, and the storyboard preview frames for a composition.
 */
export function getParityFramesFromFilm(
  film: Pick<Film, "kind" | "plan">,
): number[] {
  if (film.kind === "stock") {
    return StockFingerprintModule.SAMPLE_PARAMETERS.samples;
  }
  return film.plan ? previewFrames(film.plan) : [0];
}

/**
 * Allowed regions for one target, scaled from design units to the rendered
 * frame and rounded outward so a scaled edge never clips a changed pixel.
 */
export function getAllowedRegionsFromFilm(
  id: string,
  film: Pick<Film, "kind" | "width">,
): ParityRegion[] {
  const scale = film.kind === "stock" ? film.width / STOCK_VIEWBOX_WIDTH : 1;
  return PARITY_ALLOWANCES.filter((allowance) => {
    return allowance.id === id;
  }).map(({ region }) => {
    return {
      x: Math.floor(region.x * scale),
      y: Math.floor(region.y * scale),
      width: Math.ceil(region.width * scale),
      height: Math.ceil(region.height * scale),
    };
  });
}

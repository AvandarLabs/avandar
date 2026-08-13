import type { ValueExtent } from "@/lib/ui/viz/axis/computeValueExtent/computeValueExtent";
import type { AxisStyle } from "$/models/vizs/ChartStyle.types";

/**
 * Hard ceiling on generated ticks. A tiny interval over a huge range
 * would otherwise allocate a giant array and lock up the tab.
 */
const MAX_GENERATED_TICKS = 100;

/**
 * Tolerance for the tick-count division. Without it a lattice like
 * `0.1` steps across `0` to `0.3` divides to `2.9999999999999996` and
 * silently loses its endpoint tick.
 */
const TICK_COUNT_EPSILON = 1e-9;

/** A Recharts domain bound: a concrete number or Recharts' own choice. */
export type AxisBound = number | "auto";

/**
 * The Recharts axis props this module produces. Every field is
 * optional: an unconfigured axis yields an empty object and renders
 * exactly as it does today.
 */
export type AxisScaleProps = {
  domain?: [AxisBound, AxisBound];
  ticks?: number[];
  allowDataOverflow?: boolean;
};

type AxisScaleStyle = Pick<AxisStyle, "min" | "max" | "tickInterval">;

function _finiteOrUndefined(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/**
 * Build the tick lattice for a resolved domain, or `undefined` when it
 * would exceed {@link MAX_GENERATED_TICKS}.
 *
 * Ticks are anchored at `low`, which is what Excel does and what makes
 * an explicit minimum land exactly on a tick. `resolvedHigh` is the
 * domain's real end: a derived high has already been extended outward
 * onto the lattice by the caller, while an explicit high is left where
 * the user put it and so may sit past the final tick.
 */
function _buildTickLattice(
  low: number,
  resolvedHigh: number,
  interval: number,
): number[] | undefined {
  const tickCount =
    Math.floor((resolvedHigh - low) / interval + TICK_COUNT_EPSILON) + 1;

  // Bail before allocating: a tiny interval over a huge range would
  // otherwise build a giant array and lock up the tab.
  if (tickCount > MAX_GENERATED_TICKS) {
    return undefined;
  }

  return Array.from({ length: tickCount }, (_unused, index) => {
    return low + index * interval;
  });
}

/**
 * Translate a value axis's bounds and tick interval into Recharts
 * props.
 *
 * Recharts has no tick-step prop and its nice-number tick generator
 * would round a deliberate step (24,000) to a tidy one (25,000), so an
 * exact interval has to be expressed as an explicit `ticks` array,
 * which in turn needs concrete numbers at both ends of the domain.
 *
 * `extent` supplies those numbers for whichever bound the user left
 * blank. Pass `undefined` when the data has nothing finite to measure.
 */
export function resolveAxisScale(
  axis: AxisScaleStyle | undefined,
  extent: ValueExtent | undefined,
): AxisScaleProps {
  const explicitMin = _finiteOrUndefined(axis?.min);
  const explicitMax = _finiteOrUndefined(axis?.max);
  const rawInterval = _finiteOrUndefined(axis?.tickInterval);
  const interval =
    rawInterval !== undefined && rawInterval > 0 ? rawInterval : undefined;

  // Nothing configured: leave the axis exactly as it renders today.
  if (
    explicitMin === undefined &&
    explicitMax === undefined &&
    interval === undefined
  ) {
    return {};
  }

  // An inverted or empty explicit range is meaningless.
  if (
    explicitMin !== undefined &&
    explicitMax !== undefined &&
    explicitMin >= explicitMax
  ) {
    return {};
  }

  const hasExplicitBound =
    explicitMin !== undefined || explicitMax !== undefined;
  // `allowDataOverflow` is what makes Recharts honor a bound that cuts
  // into the data instead of silently widening back out. Derived bounds
  // always contain the data, so they never need it.
  const overflow = hasExplicitBound ? { allowDataOverflow: true } : {};

  // A derived low bound anchors at zero for non-negative data, because a
  // value axis floating off zero misrepresents the marks it scales.
  const derivedLow =
    extent === undefined ? undefined
    : extent.min >= 0 ? 0
    : extent.min;
  const low = explicitMin ?? derivedLow;
  const high = explicitMax ?? extent?.max;

  // Without two concrete numbers we cannot build a lattice, so hand the
  // unset side back to Recharts.
  if (low === undefined || high === undefined || low >= high) {
    return {
      domain: [explicitMin ?? "auto", explicitMax ?? "auto"],
      ...overflow,
    };
  }

  if (interval === undefined) {
    return { domain: [low, high], ...overflow };
  }

  // A derived high is extended outward onto the tick lattice so the
  // domain ends on a tick; an explicit high is never moved, so it may
  // truncate the last tick.
  const resolvedHigh =
    explicitMax !== undefined ?
      high
    : low + Math.ceil((high - low) / interval) * interval;

  const ticks = _buildTickLattice(low, resolvedHigh, interval);

  return {
    domain: [low, resolvedHigh],
    ...(ticks !== undefined ? { ticks } : {}),
    ...overflow,
  };
}

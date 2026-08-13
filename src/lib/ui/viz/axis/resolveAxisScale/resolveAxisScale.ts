import type { ValueExtent } from "@/lib/ui/viz/axis/computeValueExtent/computeValueExtent";
import type { AxisStyle } from "$/models/vizs/ChartStyle.types";

/** Maximum number of ticks generated for an explicit interval. */
const MAX_GENERATED_TICKS = 100;

/** Floating-point tolerance applied when counting interval steps. */
const TICK_COUNT_EPSILON = 1e-9;

/** Significant digits retained when normalizing generated tick values. */
const TICK_VALUE_PRECISION = 15;

/** A Recharts domain bound: a concrete number or Recharts' own choice. */
export type AxisBound = number | "auto";

/** The Recharts props needed to express value-axis scale settings. */
export type AxisScaleProps = {
  domain?: [AxisBound, AxisBound];
  ticks?: number[];
  allowDataOverflow?: boolean;
};

type ConcreteDomain = {
  kind: "concrete";
  low: number;
  high: number;
  explicitMax: number | undefined;
  interval: number | undefined;
  overflow: Pick<AxisScaleProps, "allowDataOverflow">;
};

type DomainResolution =
  | { kind: "props"; props: AxisScaleProps }
  | ConcreteDomain;

function _finiteOrUndefined(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ?
      value
    : undefined;
}

function _buildTickLattice({
  low,
  resolvedHigh,
  interval,
}: Readonly<{
  low: number;
  resolvedHigh: number;
  interval: number;
}>): number[] | undefined {
  const tickCount =
    Math.floor((resolvedHigh - low) / interval + TICK_COUNT_EPSILON) + 1;

  // One tick cannot express an interval. The upper bound prevents a tiny
  // interval over a large domain from allocating enough ticks to lock the UI.
  if (tickCount < 2 || tickCount > MAX_GENERATED_TICKS) {
    return undefined;
  }

  return Array.from({ length: tickCount }, (_unused, index) => {
    return Number((low + index * interval).toPrecision(TICK_VALUE_PRECISION));
  });
}

function _hasNoScaleSettings({
  explicitMin,
  explicitMax,
  interval,
}: Readonly<{
  explicitMin: number | undefined;
  explicitMax: number | undefined;
  interval: number | undefined;
}>): boolean {
  return (
    explicitMin === undefined &&
    explicitMax === undefined &&
    interval === undefined
  );
}

function _hasInvalidExplicitDomain({
  explicitMin,
  explicitMax,
}: Readonly<{
  explicitMin: number | undefined;
  explicitMax: number | undefined;
}>): boolean {
  return (
    explicitMin !== undefined &&
    explicitMax !== undefined &&
    explicitMin >= explicitMax
  );
}

function _resolveDomain({
  axis,
  extent,
}: Readonly<{
  axis: Readonly<Pick<AxisStyle, "min" | "max" | "tickInterval">> | undefined;
  extent: Readonly<ValueExtent> | undefined;
}>): DomainResolution {
  const explicitMin = _finiteOrUndefined(axis?.min);
  const explicitMax = _finiteOrUndefined(axis?.max);
  const rawInterval = _finiteOrUndefined(axis?.tickInterval);
  const interval =
    rawInterval !== undefined && rawInterval > 0 ? rawInterval : undefined;

  if (_hasNoScaleSettings({ explicitMin, explicitMax, interval })) {
    return { kind: "props", props: {} };
  }
  if (_hasInvalidExplicitDomain({ explicitMin, explicitMax })) {
    return { kind: "props", props: {} };
  }

  const hasExplicitBound =
    explicitMin !== undefined || explicitMax !== undefined;
  const overflow = hasExplicitBound ? { allowDataOverflow: true } : {};
  const derivedLow =
    extent === undefined ? undefined
    : extent.min >= 0 ? 0
    : extent.min;
  const low = explicitMin ?? derivedLow;
  const high = explicitMax ?? extent?.max;

  return low === undefined || high === undefined || low >= high ?
      {
        kind: "props",
        props: {
          domain: [explicitMin ?? "auto", explicitMax ?? "auto"],
          ...overflow,
        },
      }
    : { kind: "concrete", low, high, explicitMax, interval, overflow };
}

function _resolveConcreteDomain({
  low,
  high,
  explicitMax,
  interval,
  overflow,
}: Readonly<ConcreteDomain>): AxisScaleProps {
  if (interval === undefined) {
    return { domain: [low, high], ...overflow };
  }

  // A wider interval would extend a derived maximum too far beyond the data.
  if (explicitMax === undefined && interval > high - low) {
    return { domain: [low, high], ...overflow };
  }

  const resolvedHigh =
    explicitMax !== undefined ? high : (
      low + Math.ceil((high - low) / interval) * interval
    );
  const ticks = _buildTickLattice({ low, resolvedHigh, interval });

  return {
    domain: [low, resolvedHigh],
    ...(ticks !== undefined ? { ticks } : {}),
    ...overflow,
  };
}

/** Translates value-axis bounds and a tick interval into Recharts props. */
export function resolveAxisScale({
  axis,
  extent,
}: Readonly<{
  axis: Readonly<Pick<AxisStyle, "min" | "max" | "tickInterval">> | undefined;
  extent: Readonly<ValueExtent> | undefined;
}>): AxisScaleProps {
  const resolution = _resolveDomain({ axis, extent });
  return resolution.kind === "props" ?
      resolution.props
    : _resolveConcreteDomain(resolution);
}

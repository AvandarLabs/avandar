import { AvaMapConfigValues } from "$/models/AvaMap/AvaMapConfig/AvaMapConfigValues.ts";
import type { AvaMapConfigRead } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig.types.ts";
import type {
  ExportLayout, // oxfmt-ignore
} from "$/models/AvaMap/AvaMapConfig/ExportLayout.types.ts";
import type { Expect, IsEqual } from "@avandar/utils";

/** Export furniture applied to every new and migrated map. */
export const DEFAULT_EXPORT_LAYOUT: ExportLayout = {
  paper: "a4",
  orientation: "landscape",
  title: { isVisible: true, text: "" },
  subtitle: { isVisible: true, text: "" },
  northArrow: true,
  scaleBar: true,
  sourceLine: "",
  disclaimer: undefined,
  featureList: undefined,
};

/** Blank or whitespace-only disclaimers become unset, never stored verbatim. */
function _normalizeDisclaimer(
  disclaimer: string | undefined,
): string | undefined {
  return disclaimer?.trim() || undefined;
}

/**
 * Keeps a feature list's row cap a whole number from 1 to 1,000, so a typed
 * value can never make the persisted config fail its schema. A value that is
 * not a number falls back to the default cap.
 */
function _normalizeFeatureList(
  featureList: ExportLayout["featureList"],
): ExportLayout["featureList"] {
  if (featureList === undefined) {
    return undefined;
  }
  const maxRows = Number.isFinite(featureList.maxRows)
    ? Math.min(
        AvaMapConfigValues.exportFeatureListMaxRows,
        Math.max(1, Math.round(featureList.maxRows)),
      )
    : AvaMapConfigValues.exportFeatureListDefaultMaxRows;
  return maxRows === featureList.maxRows
    ? featureList
    : { ...featureList, maxRows };
}

/** True when two header lines are equal. */
function _isSameHeaderLine(
  first: ExportLayout["title"],
  second: ExportLayout["title"],
): boolean {
  return first.isVisible === second.isVisible && first.text === second.text;
}

/** True when two feature lists, or two unset lists, are equal. */
function _isSameFeatureList(
  first: ExportLayout["featureList"],
  second: ExportLayout["featureList"],
): boolean {
  if (first === undefined || second === undefined) {
    return first === second;
  }
  return (
    first.layerId === second.layerId &&
    first.maxRows === second.maxRows &&
    first.sort?.columnId === second.sort?.columnId &&
    first.sort?.direction === second.sort?.direction &&
    first.columnIds.length === second.columnIds.length &&
    first.columnIds.every((columnId, index) => {
      return columnId === second.columnIds[index];
    })
  );
}

/** Every scalar `ExportLayout` field compared by `_isSameLayout` directly. */
const _SCALAR_KEYS = [
  "paper",
  "orientation",
  "northArrow",
  "scaleBar",
  "sourceLine",
  "disclaimer",
] as const;

type _ScalarKey = (typeof _SCALAR_KEYS)[number];

/**
 * Compile-time exhaustiveness guard: fails `pnpm type-check` if `ExportLayout`
 * gains a field that neither `_SCALAR_KEYS`, `_isSameHeaderLine`'s two call
 * sites, nor `_isSameFeatureList` account for, so a forgotten field can never
 * silently make `_isSameLayout` treat a real edit as a no-op.
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Type test - this variable is intentionally not used
type _ExhaustiveExportLayoutKeys = Expect<
  IsEqual<keyof ExportLayout, _ScalarKey | "title" | "subtitle" | "featureList">
>;

/** True when two layouts are field-for-field equal. */
function _isSameLayout(first: ExportLayout, second: ExportLayout): boolean {
  return (
    _SCALAR_KEYS.every((key) => {
      return first[key] === second[key];
    }) &&
    _isSameHeaderLine(first.title, second.title) &&
    _isSameHeaderLine(first.subtitle, second.subtitle) &&
    _isSameFeatureList(first.featureList, second.featureList)
  );
}

/** Export-layout updates for map configuration. */
export const exportLayoutUpdaters = {
  /** Export furniture applied to every new and migrated map. */
  defaultExportLayout: DEFAULT_EXPORT_LAYOUT,

  /**
   * Replaces the map's export furniture.
   *
   * A blank disclaimer is normalized to unset, so the furniture strip and the
   * page fall back to the localized default instead of showing nothing. A
   * feature list's row cap is kept a whole number from 1 to 1,000.
   */
  withExportLayout: (
    options: Readonly<{
      config: AvaMapConfigRead;
      exportLayout: ExportLayout;
    }>,
  ): AvaMapConfigRead => {
    const { config, exportLayout } = options;
    const normalizedExportLayout: ExportLayout = {
      ...exportLayout,
      disclaimer: _normalizeDisclaimer(exportLayout.disclaimer),
      featureList: _normalizeFeatureList(exportLayout.featureList),
    };
    return _isSameLayout(config.exportLayout, normalizedExportLayout)
      ? config
      : { ...config, exportLayout: normalizedExportLayout };
  },
};

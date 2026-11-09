import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { UnknownDataFrame } from "@avandar/utils";

/** How many categories keep their own series before the rest join Other. */
const MAX_NAMED_CATEGORIES = 8;

type LongResult = {
  columns: readonly QueryResult.Column[];
  data: UnknownDataFrame;

  /** Names of the columns the chart treats as dates. */
  dateColumns: ReadonlySet<string>;

  /** The column the chart draws on its X axis. */
  xColumnName: string;

  /** The numeric column the chart draws as its one series. */
  valueColumnName: string;

  /** The series name for the categories past the top eight. */
  otherLabel: string;

  /** The series name for categories that are empty text. */
  blankLabel: string;
};

/**
 * A query result reshaped for an XY chart. When `isSplit` is true, `data`
 * holds one row per X value and one numeric column per name in
 * `seriesColumnNames`, split by the categories in `splitColumnName`. When
 * `hasOtherSeries` is true, the last series name is the Other bucket.
 * Otherwise `data` is the input, untouched.
 */
export type WideResult =
  | { isSplit: false; data: UnknownDataFrame }
  | {
      isSplit: true;
      data: UnknownDataFrame;
      seriesColumnNames: readonly string[];
      splitColumnName: string;
      hasOtherSeries: boolean;
    };

type SeriesPlan = {
  seriesColumnNames: readonly string[];
  hasOtherSeries: boolean;
};

type XGroup = { xValue: unknown; sums: Map<string, number> };

function _isXColumn(
  column: QueryResult.Column | undefined,
  dateColumns: ReadonlySet<string>,
): boolean {
  return (
    column !== undefined &&
    (dateColumns.has(column.name) ||
      AvaDataType.isTemporal(column.dataType) ||
      AvaDataType.isText(column.dataType))
  );
}

/** The one text column left besides the X and numeric columns, if any. */
function _getCategoryColumnName(options: LongResult): string | undefined {
  const { columns, dateColumns, xColumnName, valueColumnName } = options;
  const valueColumn = columns.find((column) => {
    return column.name === valueColumnName;
  });
  const xColumn = columns.find((column) => {
    return column.name === xColumnName;
  });
  if (
    xColumnName === valueColumnName ||
    !_isXColumn(xColumn, dateColumns) ||
    valueColumn === undefined ||
    !AvaDataType.isNumeric(valueColumn.dataType)
  ) {
    return undefined;
  }
  const otherColumns = columns.filter((column) => {
    return (
      column.name !== xColumnName && !AvaDataType.isNumeric(column.dataType)
    );
  });
  const [categoryColumn] = otherColumns;
  return otherColumns.length === 1 &&
    categoryColumn !== undefined &&
    AvaDataType.isText(categoryColumn.dataType) &&
    !dateColumns.has(categoryColumn.name)
    ? categoryColumn.name
    : undefined;
}

function _getNumberFromValue(value: unknown): number | undefined {
  if (typeof value === "bigint") {
    return Number(value);
  }
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

/** A category's series name: empty text is blank, and `null` has none. */
function _getCategoryFromValue(
  value: unknown,
  blankLabel: string,
): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  const category = String(value);
  return category.trim() === "" ? blankLabel : category;
}

/** Category names, largest total first. Ties keep the result's order. */
function _rankCategories(
  options: LongResult,
  categoryColumnName: string,
): string[] {
  const { data, valueColumnName, blankLabel } = options;
  const totals = data.reduce((totalsByCategory, row) => {
    const category = _getCategoryFromValue(row[categoryColumnName], blankLabel);
    if (category !== undefined) {
      const value = _getNumberFromValue(row[valueColumnName]) ?? 0;
      totalsByCategory.set(
        category,
        (totalsByCategory.get(category) ?? 0) + value,
      );
    }
    return totalsByCategory;
  }, new Map<string, number>());
  return [...totals.entries()]
    .sort(([, totalA], [, totalB]) => {
      return totalB - totalA;
    })
    .map(([category]) => {
      return category;
    });
}

function _getTimeFromValue(value: unknown): number {
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === "number") {
    return value;
  }
  return typeof value === "string" ? Date.parse(value) : Number.NaN;
}

/** Sorts groups by date, oldest first, with unreadable dates last. */
function _sortGroupsByDate(groups: readonly XGroup[]): XGroup[] {
  return [...groups].sort((groupA, groupB) => {
    const timeA = _getTimeFromValue(groupA.xValue);
    const timeB = _getTimeFromValue(groupB.xValue);
    if (Number.isNaN(timeA) || Number.isNaN(timeB)) {
      return Number(Number.isNaN(timeA)) - Number(Number.isNaN(timeB));
    }
    return timeA - timeB;
  });
}

/** One group per X value, in the result's order, summing each series. */
function _groupRowsByX(
  options: Readonly<{
    data: UnknownDataFrame;
    xColumnName: string;
    valueColumnName: string;
    getSeriesName: (row: Record<string, unknown>) => string;
  }>,
): XGroup[] {
  const { data, xColumnName, valueColumnName, getSeriesName } = options;
  const groups = data.reduce((groupsByX, row) => {
    const xValue = row[xColumnName];
    const xKey = xValue instanceof Date ? xValue.getTime() : xValue;
    const group = groupsByX.get(xKey) ?? { xValue, sums: new Map() };
    const value = _getNumberFromValue(row[valueColumnName]);
    if (value !== undefined) {
      const seriesName = getSeriesName(row);
      group.sums.set(seriesName, (group.sums.get(seriesName) ?? 0) + value);
    }
    return groupsByX.set(xKey, group);
  }, new Map<unknown, XGroup>());
  return [...groups.values()];
}

/**
 * The series names: the top categories, then Other when anything is left.
 * Undefined when there are fewer than two categories, or when two series, or
 * a series and the X column, would share a name.
 */
function _planSeries(
  options: LongResult,
  categoryColumnName: string,
): SeriesPlan | undefined {
  const { data, xColumnName, otherLabel, blankLabel } = options;
  const rankedCategories = _rankCategories(options, categoryColumnName);
  const hasNullCategory = data.some((row) => {
    return (
      _getCategoryFromValue(row[categoryColumnName], blankLabel) === undefined
    );
  });
  const hasOtherSeries =
    rankedCategories.length > MAX_NAMED_CATEGORIES || hasNullCategory;
  const namedCategories = rankedCategories.slice(0, MAX_NAMED_CATEGORIES);
  const seriesColumnNames = hasOtherSeries
    ? [...namedCategories, otherLabel]
    : namedCategories;
  const outputNames = new Set([xColumnName, ...seriesColumnNames]);
  return rankedCategories.length < 2 ||
    outputNames.size !== seriesColumnNames.length + 1
    ? undefined
    : { seriesColumnNames, hasOtherSeries };
}

function _isDateXColumn(options: LongResult): boolean {
  const xColumn = options.columns.find((column) => {
    return column.name === options.xColumnName;
  });
  return (
    options.dateColumns.has(options.xColumnName) ||
    (xColumn !== undefined && AvaDataType.isTemporal(xColumn.dataType))
  );
}

/** One row per group: its X value, then each series' sum or `null`. */
function _buildWideRows(
  options: Readonly<{
    groups: readonly XGroup[];
    xColumnName: string;
    seriesColumnNames: readonly string[];
  }>,
): UnknownDataFrame {
  const { groups, xColumnName, seriesColumnNames } = options;
  return groups.map((group) => {
    return {
      [xColumnName]: group.xValue,
      ...Object.fromEntries(
        seriesColumnNames.map((name) => {
          return [name, group.sums.get(name) ?? null];
        }),
      ),
    };
  });
}

/**
 * Reshapes a long query result (one row per X value and category, such as
 * `week, district, cases`) into a wide one with one numeric column per
 * category, so an XY chart draws one series per category instead of one
 * zigzag line. Use it before drawing a line, bar, or area chart of a result
 * whose rows repeat each X value, for example cases by week and district.
 *
 * Splits only when the X column is a date or text, the value column is
 * numeric, and exactly one other text column is left to split by. Other
 * numeric columns are dropped, since the chart draws only `valueColumnName`.
 * The eight largest categories by total keep their own series. The rest,
 * and every row whose category is `null`, are summed into `otherLabel`.
 * Empty text categories become `blankLabel`, and a missing X and category
 * pair is `null`.
 * Date X values are sorted oldest first; text X values keep the result's
 * order. Returns the input unchanged when the shape does not match or there
 * is only one category.
 */
export function makeWideResultFromLongResult(options: LongResult): WideResult {
  const { data, xColumnName, otherLabel, blankLabel } = options;
  const categoryColumnName = _getCategoryColumnName(options);
  const plan =
    categoryColumnName === undefined
      ? undefined
      : _planSeries(options, categoryColumnName);
  if (categoryColumnName === undefined || plan === undefined) {
    return { isSplit: false, data };
  }
  const namedSeries = new Set(plan.seriesColumnNames);
  const groups = _groupRowsByX({
    data,
    xColumnName,
    valueColumnName: options.valueColumnName,
    getSeriesName: (row) => {
      const category = _getCategoryFromValue(
        row[categoryColumnName],
        blankLabel,
      );
      return category !== undefined && namedSeries.has(category)
        ? category
        : otherLabel;
    },
  });
  return {
    isSplit: true,
    seriesColumnNames: plan.seriesColumnNames,
    splitColumnName: categoryColumnName,
    hasOtherSeries: plan.hasOtherSeries,
    data: _buildWideRows({
      groups: _isDateXColumn(options) ? _sortGroupsByDate(groups) : groups,
      xColumnName,
      seriesColumnNames: plan.seriesColumnNames,
    }),
  };
}

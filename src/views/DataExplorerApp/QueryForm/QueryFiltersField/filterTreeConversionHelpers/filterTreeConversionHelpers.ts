import { isArray } from "@avandar/utils";
import { QueryFilterOperator } from "$/models/queries/StructuredQuery/QueryFilterOperator/QueryFilterOperator";
import { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";
import { match } from "ts-pattern";
import type { QueryFilterColumnTypes } from "$/models/queries/StructuredQuery/QueryFilter.types";

/**
 * A rule in `react-querybuilder`'s shape. Operator names are our own internal
 * operator ids: the library is configured with our operator list, so no
 * translation table exists to drift out of sync.
 */
export type LibraryRule = {
  id?: string;
  field: string;
  operator: QueryFilterOperator;
  value: StructuredQuery.FilterRule["value"];
};

/** A group in `react-querybuilder`'s shape. */
export type LibraryGroup = {
  id?: string;
  combinator: string;
  rules: ReadonlyArray<LibraryGroup | LibraryRule>;
};

/** Inputs for converting a library tree into our filter group. */
export type QueryFilterGroupFromLibraryGroupOptions = {
  group: LibraryGroup;
  /** Live column types, used to stamp each rule's `columnDataType`. */
  columnTypes: QueryFilterColumnTypes;
  /** Per-rule `Match case` state, keyed by rule id. */
  matchCaseById: Record<string, boolean>;
};

function _isLibraryGroup(
  node: LibraryGroup | LibraryRule,
): node is LibraryGroup {
  return "rules" in node && "combinator" in node;
}

/**
 * Narrows a value coming out of react-querybuilder, whose `value` prop is typed
 * `any`. Everything downstream (validation, completeness, SQL rendering) runs
 * on the result, so it has to be checked here rather than asserted.
 */
export function getFilterValueFromLibraryValue(
  value: unknown,
): StructuredQuery.FilterRule["value"] {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return value;
  }
  if (isArray(value)) {
    return value.filter((item): item is string | number => {
      return typeof item === "string" || typeof item === "number";
    });
  }
  return "";
}

/** Converts one of our filter groups into the library's tree shape. */
export function makeLibraryFilterGroupFromQueryFilterGroup(
  group: StructuredQuery.FilterGroup,
): LibraryGroup {
  return {
    id: group.id ?? StructuredQuery.makeFilterNodeId(),
    combinator: group.combinator,
    rules: group.rules.map((child) => {
      if (child.type === "group") {
        return makeLibraryFilterGroupFromQueryFilterGroup(child);
      }
      return {
        id: child.id ?? StructuredQuery.makeFilterNodeId(),
        field: child.columnName,
        operator: child.operator,
        value: child.value,
      };
    }),
  };
}

/**
 * Converts the library's tree back into our shape.
 *
 * Ids are carried through both directions, which is what keeps React from
 * remounting a rule row (and stealing focus from its value input) on every
 * edit. `columnDataType` is re-derived from the live column types rather than
 * round-tripped, so a rule cannot hold a type the dataset no longer has.
 */
export function makeQueryFilterGroupFromLibraryGroup(
  options: Readonly<QueryFilterGroupFromLibraryGroupOptions>,
): StructuredQuery.FilterGroup {
  return {
    type: "group",
    id: options.group.id ?? StructuredQuery.makeFilterNodeId(),
    combinator:
      String(options.group.combinator).toUpperCase() === "OR" ? "OR" : "AND",
    rules: options.group.rules.map((child) => {
      if (_isLibraryGroup(child)) {
        return makeQueryFilterGroupFromLibraryGroup({
          group: child,
          columnTypes: options.columnTypes,
          matchCaseById: options.matchCaseById,
        });
      }
      const id = child.id ?? StructuredQuery.makeFilterNodeId();
      const columnDataType = options.columnTypes[child.field];
      const matchCase = options.matchCaseById[id];
      const rule: StructuredQuery.FilterRule = {
        type: "rule",
        id,
        columnName: child.field,
        operator:
          QueryFilterOperator.isOperator(child.operator) ? child.operator : "=",
        value: getFilterValueFromLibraryValue(child.value),
        ...(columnDataType === undefined ? {} : { columnDataType }),
        ...(matchCase ? { matchCase: true } : {}),
      };
      return rule;
    }),
  };
}

/** Seeds the match-case map from a tree that already carries the flag. */
export function getMatchCaseByIdFromFilterGroup(
  group: StructuredQuery.FilterGroup,
): Record<string, boolean> {
  return Object.fromEntries(
    group.rules.flatMap((child) => {
      return match(child)
        .with({ type: "group" }, (nestedGroup): Array<[string, boolean]> => {
          return Object.entries(getMatchCaseByIdFromFilterGroup(nestedGroup));
        })
        .with({ type: "rule" }, (rule): Array<[string, boolean]> => {
          return rule.id !== undefined && rule.matchCase === true ?
              [[rule.id, true]]
            : [];
        })
        .exhaustive();
    }),
  );
}

/**
 * Keeps each rule's operator legal for its column's type.
 *
 * `react-querybuilder`'s own `resetOnFieldChange` clears the operator and value
 * on every column change. Do not use it: it would drop work whenever the user
 * picks a new column. Keep both when the new column shares the type facet;
 * reset only when the operator cannot apply.
 */
export function normalizeLibraryTree(
  options: Readonly<{
    group: LibraryGroup;
    columnTypes: QueryFilterColumnTypes;
  }>,
): LibraryGroup {
  return {
    ...options.group,
    rules: options.group.rules.map((child) => {
      if (_isLibraryGroup(child)) {
        return normalizeLibraryTree({
          group: child,
          columnTypes: options.columnTypes,
        });
      }
      const dataType = options.columnTypes[child.field];
      return (
          dataType === undefined ||
            QueryFilterOperator.isOfferedForDataType(child.operator, dataType)
        ) ?
          child
        : {
            ...child,
            operator: QueryFilterOperator.getDefaultForDataType(dataType),
            value: "",
          };
    }),
  };
}

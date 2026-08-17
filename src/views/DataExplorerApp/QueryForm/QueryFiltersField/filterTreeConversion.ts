import { makeQueryFilterNodeId } from "$/models/queries/StructuredQuery/QueryFilter.types";
import {
  defaultOperatorForDataType,
  operatorsForDataType,
} from "$/models/queries/StructuredQuery/QueryFilterOperator";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type {
  QueryFilterGroup,
  QueryFilterOperator,
  QueryFilterRule,
} from "$/models/queries/StructuredQuery/QueryFilter.types";

/**
 * A rule in `react-querybuilder`'s shape. Operator names are our own internal
 * operator ids: the library is configured with our operator list, so no
 * translation table exists to drift out of sync.
 */
export type LibraryRule = {
  id?: string;
  field: string;
  operator: string;
  value: unknown;
};

export type LibraryGroup = {
  id?: string;
  combinator: string;
  rules: ReadonlyArray<LibraryGroup | LibraryRule>;
};

export type ToInternalOptions = {
  /** Live column types, used to stamp each rule's `columnDataType`. */
  columnTypes: Readonly<Record<string, AvaDataType.T>>;
  /** Per-rule `Match case` state, keyed by rule id. */
  matchCaseById: Readonly<Record<string, boolean>>;
};

function _isLibraryGroup(
  node: LibraryGroup | LibraryRule,
): node is LibraryGroup {
  return "rules" in node && "combinator" in node;
}

/** Converts one of our filter groups into the library's tree shape. */
export function toLibraryFilterGroup(group: QueryFilterGroup): LibraryGroup {
  return {
    id: group.id ?? makeQueryFilterNodeId(),
    combinator: group.combinator,
    rules: group.rules.map((child) => {
      if (child.type === "group") {
        return toLibraryFilterGroup(child);
      }
      return {
        id: child.id ?? makeQueryFilterNodeId(),
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
export function toInternalFilterGroup(
  group: LibraryGroup,
  options: ToInternalOptions,
): QueryFilterGroup {
  return {
    type: "group",
    id: group.id ?? makeQueryFilterNodeId(),
    combinator: String(group.combinator).toUpperCase() === "OR" ? "OR" : "AND",
    rules: group.rules.map((child) => {
      if (_isLibraryGroup(child)) {
        return toInternalFilterGroup(child, options);
      }
      const id = child.id ?? makeQueryFilterNodeId();
      const columnDataType = options.columnTypes[child.field];
      const matchCase = options.matchCaseById[id];
      const rule: QueryFilterRule = {
        type: "rule",
        id,
        columnName: child.field,
        operator: child.operator as QueryFilterOperator,
        value: child.value as QueryFilterRule["value"],
        ...(columnDataType === undefined ? {} : { columnDataType }),
        ...(matchCase ? { matchCase: true } : {}),
      };
      return rule;
    }),
  };
}

/**
 * Seeds the match-case map from a tree that already carries the flag.
 *
 * Writes into one accumulator rather than spreading it per rule, which would
 * copy the whole map at every step and make a deep tree quadratic.
 */
export function collectMatchCaseById(
  group: QueryFilterGroup,
): Record<string, boolean> {
  const collected: Record<string, boolean> = {};
  const visit = (node: QueryFilterGroup): void => {
    node.rules.forEach((child) => {
      if (child.type === "group") {
        visit(child);
        return;
      }
      if (child.id !== undefined && child.matchCase === true) {
        collected[child.id] = true;
      }
    });
  };
  visit(group);
  return collected;
}

/**
 * Keeps each rule's operator legal for its column's type.
 *
 * `react-querybuilder`'s own `resetOnFieldChange` clears the operator and value
 * on every column change, which silently discarded work. This is the narrower
 * rule: keep both when the new column has the same type facet, reset only when
 * the operator genuinely cannot apply. Rules on columns we know nothing about
 * are left alone, because an unknown column is rendered as text and every text
 * operator is legal there.
 */
export function normalizeLibraryTree(
  group: LibraryGroup,
  columnTypes: Readonly<Record<string, AvaDataType.T>>,
): LibraryGroup {
  return {
    ...group,
    rules: group.rules.map((child) => {
      if (_isLibraryGroup(child)) {
        return normalizeLibraryTree(child, columnTypes);
      }
      const dataType = columnTypes[child.field];
      if (dataType === undefined) {
        return child;
      }
      const allowed = operatorsForDataType(dataType);
      if (allowed.includes(child.operator as QueryFilterOperator)) {
        return child;
      }
      return {
        ...child,
        operator: defaultOperatorForDataType(dataType),
        value: "",
      };
    }),
  };
}

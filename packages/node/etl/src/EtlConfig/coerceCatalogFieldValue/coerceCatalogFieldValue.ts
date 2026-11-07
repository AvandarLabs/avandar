import type { CatalogMappableField } from "@etl/EtlConfig/PipelineConfig.types";

/** A coerced value, and why the raw value was dropped when it was. */
export type CatalogFieldCoercion = Readonly<{
  value: string | readonly string[] | Date | undefined;
  /** Set only when a present value had the wrong type. */
  problem?: string;
}>;

const TEXT_ARRAY_FIELDS: ReadonlySet<CatalogMappableField> = new Set([
  "canonical_urls",
  "domains",
  "tags",
]);

const DATE_FIELDS: ReadonlySet<CatalogMappableField> = new Set([
  "coverage_start_date",
  "coverage_end_date",
]);

const NO_VALUE: CatalogFieldCoercion = { value: undefined };

/** A date, optionally with a time that must carry `Z` or a `+HH:MM` offset. */
const ISO_8601_PATTERN =
  /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2}))?$/;

function _describeType(value: unknown): string {
  if (value === null) {
    return "null";
  }
  return Array.isArray(value) ? "list" : typeof value;
}

function _coerceText(value: unknown): CatalogFieldCoercion {
  if (typeof value !== "string") {
    return {
      value: undefined,
      problem: `expected text, got ${_describeType(value)}`,
    };
  }
  const trimmed = value.trim();
  return trimmed === "" ? NO_VALUE : { value: trimmed };
}

function _coerceTextArray(value: unknown): CatalogFieldCoercion {
  const items: readonly unknown[] = Array.isArray(value) ? value : [value];
  const nonStringIndex = items.findIndex((item) => {
    return typeof item !== "string";
  });
  if (nonStringIndex !== -1) {
    return {
      value: undefined,
      problem: Array.isArray(value)
        ? `expected text or a list of text, got a list holding ${_describeType(items[nonStringIndex])}`
        : `expected text or a list of text, got ${_describeType(value)}`,
    };
  }
  const texts = [
    ...new Set(
      (items as readonly string[])
        .map((item) => {
          return item.trim();
        })
        .filter((item) => {
          return item !== "";
        }),
    ),
  ];
  return texts.length === 0 ? NO_VALUE : { value: texts };
}

function _coerceDate(value: unknown): CatalogFieldCoercion {
  if (typeof value !== "string") {
    return {
      value: undefined,
      problem: `expected an ISO 8601 date, got ${_describeType(value)}`,
    };
  }
  const trimmed = value.trim();
  if (trimmed === "") {
    return NO_VALUE;
  }
  const time = ISO_8601_PATTERN.test(trimmed)
    ? Date.parse(trimmed)
    : Number.NaN;
  if (Number.isNaN(time)) {
    return {
      value: undefined,
      problem: `expected an ISO 8601 date, got ${JSON.stringify(value)}`,
    };
  }
  return { value: new Date(time) };
}

/**
 * Coerces a raw value, from a `from` path, a constant, or a script, to the
 * type its field stores (spec section 4.4 of
 * `docs/measles-demo/catalog-field-mapping-design.md`). `undefined`, `null`,
 * and blank text are no value and no problem. A value of the wrong type is
 * dropped with a problem the caller logs.
 *
 * @param args.field - The field the value is for.
 * @param args.value - The raw value.
 * @returns The coerced value, and a problem when one was dropped.
 */
export function coerceCatalogFieldValue(args: {
  field: CatalogMappableField;
  value: unknown;
}): CatalogFieldCoercion {
  const { field, value } = args;
  if (value === undefined || value === null) {
    return NO_VALUE;
  }
  if (TEXT_ARRAY_FIELDS.has(field)) {
    return _coerceTextArray(value);
  }
  if (DATE_FIELDS.has(field)) {
    return _coerceDate(value);
  }
  return _coerceText(value);
}

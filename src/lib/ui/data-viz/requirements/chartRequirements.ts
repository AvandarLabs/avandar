import { match } from "ts-pattern";
import { QueryResultField } from "@/clients/LocalDatasetQueryClient";
import { UnknownDataFrame } from "@/lib/types/common";
import { isEpochMs, isIsoDateString } from "@/lib/utils/formatters/formatDate";

export type FieldKind = "number" | "string" | "date";

export function describeFieldKinds(kinds: FieldKind[]): string {
  return kinds.join(" / ");
}

/**  Determine a field's kind using
both declared dataType and a sample value. */
export function getFieldKind(
  field: QueryResultField,
  sampleValue: unknown,
): FieldKind | null {
  // Prefer explicit dataType when present
  const fromDeclared = match(field.dataType)
    .with("number", () => {
      return "number" as const;
    })
    .with("date", () => {
      return "date" as const;
    })
    .with("string", () => {
      return "string" as const;
    })
    .otherwise(() => {
      return null;
    });

  if (fromDeclared) return fromDeclared;

  // Fallback: infer from sample value
  return match(typeof sampleValue)
    .with("number", () => {
      return "number" as const;
    })
    .with("string", () => {
      if (isIsoDateString(sampleValue) || isEpochMs(sampleValue)) return "date";
      return "string";
    })
    .otherwise(() => {
      return null;
    });
}

/**  Classify queried fields into buckets
 by kind using the first row as a sample. */
export function classifyFieldsByKind(
  fields: readonly QueryResultField[],
  data: UnknownDataFrame,
): Record<FieldKind, string[]> {
  const firstRow = data?.[0] ?? {};
  const buckets: Record<FieldKind, string[]> = {
    number: [],
    string: [],
    date: [],
  };

  for (const field of fields) {
    const sampleValue = firstRow?.[field.name];
    const fieldKind = getFieldKind(field, sampleValue);
    if (fieldKind) buckets[fieldKind].push(field.name);
  }

  return buckets;
}

/**  Declarative expectations for
     each chart type. Keep this tiny and explicit. */
export const CHART_REQUIREMENTS = {
  bar: {
    x: ["string", "date"] as FieldKind[],
    y: ["number"] as FieldKind[],
  },
  line: {
    x: ["string", "date"] as FieldKind[],
    y: ["number"] as FieldKind[],
  },
  // table has no requirements
};

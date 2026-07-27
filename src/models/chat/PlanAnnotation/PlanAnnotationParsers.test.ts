import { describe, expect, it } from "vitest";
import { PlanAnnotationParsers } from "./PlanAnnotationParsers";
import type { PlanAnnotation } from "./PlanAnnotation";

const base = {
  planId: "plan-1",
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_100,
  text: "Annotation",
  color: "#123456",
};

const annotations: PlanAnnotation.T[] = [
  {
    ...base,
    id: "00000000-0000-4000-8000-000000000001" as PlanAnnotation.Id,
    kind: "text",
    x: 10,
    y: 20,
    fontSize: 16,
    rotation: 45,
  },
  {
    ...base,
    id: "00000000-0000-4000-8000-000000000002" as PlanAnnotation.Id,
    kind: "sticky",
    x: 30,
    y: 40,
    width: 200,
    height: 120,
  },
  {
    ...base,
    id: "00000000-0000-4000-8000-000000000003" as PlanAnnotation.Id,
    kind: "arrow",
    fromX: 1,
    fromY: 2,
    toX: 3,
    toY: 4,
  },
  {
    ...base,
    id: "00000000-0000-4000-8000-000000000004" as PlanAnnotation.Id,
    kind: "stroke",
    points: [
      [1, 2],
      [3, 4, 0.5],
    ],
    strokeWidth: 3,
  },
];

describe("PlanAnnotationParsers", () => {
  it.each(annotations)("parses a $kind annotation", (annotation) => {
    expect(PlanAnnotationParsers.DBReadSchema.parse(annotation)).toEqual(
      annotation,
    );
  });

  it("converts every parser direction without changing the row", () => {
    const annotation = annotations[0]!;
    const update: PlanAnnotation.T<"Update"> = {
      text: "Updated",
      updatedAt: 1_700_000_000_200,
    };

    expect(PlanAnnotationParsers.fromDBReadToModelRead(annotation)).toEqual(
      annotation,
    );
    expect(PlanAnnotationParsers.fromModelInsertToDBInsert(annotation)).toEqual(
      annotation,
    );
    expect(PlanAnnotationParsers.fromModelUpdateToDBUpdate(update)).toEqual(
      update,
    );
  });

  it("rejects fields from a different annotation variant", () => {
    expect(() => {
      PlanAnnotationParsers.DBReadSchema.parse({
        ...annotations[0],
        width: 100,
      });
    }).toThrow();
  });
});

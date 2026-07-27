import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AvaDexie } from "@/db/dexie/AvaDexie";
import { PlanAnnotationParsers } from "@/models/chat/PlanAnnotation/PlanAnnotationParsers";
import { PlanAnnotationClient } from "./PlanAnnotationClient";
import type { PlanAnnotation } from "@/models/chat/PlanAnnotation/PlanAnnotation";

function createAnnotation(
  overrides: Partial<PlanAnnotation.Text> = {},
): PlanAnnotation.Text {
  return {
    id: crypto.randomUUID() as PlanAnnotation.Id,
    planId: "plan-1",
    kind: "text",
    x: 10,
    y: 20,
    fontSize: 14,
    text: "Note",
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe("PlanAnnotationClient", () => {
  beforeEach(async () => {
    await AvaDexie.DB.PlanAnnotation.clear();
  });

  it("upserts one annotation by id", async () => {
    const annotation = createAnnotation();
    const parserSpy = vi.spyOn(
      PlanAnnotationParsers,
      "fromModelInsertToDBInsert",
    );

    await PlanAnnotationClient.putAnnotation(annotation);
    await PlanAnnotationClient.putAnnotation({
      ...annotation,
      text: "Updated note",
      updatedAt: 2,
    });

    expect(await AvaDexie.DB.PlanAnnotation.toArray()).toEqual([
      expect.objectContaining({
        id: annotation.id,
        text: "Updated note",
        updatedAt: 2,
      }),
    ]);
    expect(parserSpy).toHaveBeenCalledTimes(2);
  });

  it("bulk upserts annotations and ignores an empty collection", async () => {
    const firstAnnotation = createAnnotation();
    const secondAnnotation = createAnnotation({ planId: "plan-2" });
    const parserSpy = vi.spyOn(
      PlanAnnotationParsers,
      "fromModelInsertToDBInsert",
    );

    await PlanAnnotationClient.putAnnotations([
      firstAnnotation,
      secondAnnotation,
    ]);
    await PlanAnnotationClient.putAnnotations([
      { ...firstAnnotation, text: "Updated in bulk" },
    ]);
    await PlanAnnotationClient.putAnnotations([]);

    expect(await AvaDexie.DB.PlanAnnotation.count()).toBe(2);
    expect(await AvaDexie.DB.PlanAnnotation.get(firstAnnotation.id)).toEqual(
      expect.objectContaining({ text: "Updated in bulk" }),
    );
    expect(parserSpy).toHaveBeenCalledTimes(3);
  });

  it("lists only annotations belonging to the requested plan", async () => {
    const planAnnotation = createAnnotation();
    const parserSpy = vi.spyOn(PlanAnnotationParsers, "fromDBReadToModelRead");
    await AvaDexie.DB.PlanAnnotation.bulkPut([
      planAnnotation,
      createAnnotation({ planId: "plan-2" }),
    ]);

    expect(await PlanAnnotationClient.listAnnotationsForPlan("plan-1")).toEqual(
      [planAnnotation],
    );
    expect(parserSpy).toHaveBeenCalledWith(planAnnotation);
  });

  it("rejects invalid rows read from IndexedDB", async () => {
    await AvaDexie.DB.PlanAnnotation.put({
      ...createAnnotation(),
      kind: "invalid",
    } as unknown as PlanAnnotation.T);

    await expect(
      PlanAnnotationClient.listAnnotationsForPlan("plan-1"),
    ).rejects.toThrow("[PlanAnnotation:DBReadSchema]");
  });

  it("deletes an annotation by id", async () => {
    const annotation = createAnnotation();
    await AvaDexie.DB.PlanAnnotation.put(annotation);

    await PlanAnnotationClient.deleteAnnotation(annotation.id);

    expect(await AvaDexie.DB.PlanAnnotation.count()).toBe(0);
  });

  it("clears annotations for one plan without affecting another", async () => {
    await AvaDexie.DB.PlanAnnotation.bulkPut([
      createAnnotation(),
      createAnnotation({ planId: "plan-1" }),
      createAnnotation({ planId: "plan-2" }),
    ]);

    await PlanAnnotationClient.clearAnnotationsForPlan("plan-1");

    expect(await AvaDexie.DB.PlanAnnotation.toArray()).toEqual([
      expect.objectContaining({ planId: "plan-2" }),
    ]);
  });

  it("clears all annotations", async () => {
    await AvaDexie.DB.PlanAnnotation.bulkPut([
      createAnnotation(),
      createAnnotation({ planId: "plan-2" }),
    ]);

    await PlanAnnotationClient.clearAllAnnotations();

    expect(await AvaDexie.DB.PlanAnnotation.count()).toBe(0);
  });

  it("exposes hooks for every named operation", () => {
    expect(PlanAnnotationClient.usePutAnnotation).toBeTypeOf("function");
    expect(PlanAnnotationClient.usePutAnnotations).toBeTypeOf("function");
    expect(PlanAnnotationClient.useListAnnotationsForPlan).toBeTypeOf(
      "function",
    );
    expect(PlanAnnotationClient.useDeleteAnnotation).toBeTypeOf("function");
    expect(PlanAnnotationClient.useClearAnnotationsForPlan).toBeTypeOf(
      "function",
    );
    expect(PlanAnnotationClient.useClearAllAnnotations).toBeTypeOf("function");
  });
});

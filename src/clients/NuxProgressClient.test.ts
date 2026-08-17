import { describe, expect, it } from "vitest";
import { NuxProgressDBReadToModelReadSchema } from "@/clients/NuxProgressClient";

const DB_ROW = {
  id: "11111111-1111-4111-8111-111111111111",
  user_id: "22222222-2222-4222-8222-222222222222",
  tutorial_key: "first_dashboard",
  status: "in_progress",
  completed_milestones: ["add_dataset"],
  created_at: "2026-08-16T00:00:00.000Z",
  updated_at: "2026-08-16T00:00:00.000Z",
};

describe("NuxProgressDBReadToModelReadSchema", () => {
  it("camel-cases the row and renames id to progressId", () => {
    const model = NuxProgressDBReadToModelReadSchema.parse(DB_ROW);
    expect(model.progressId).toBe(DB_ROW.id);
    expect(model.userId).toBe(DB_ROW.user_id);
    expect(model.status).toBe("in_progress");
    expect(model.createdAt).toBeInstanceOf(Date);
  });

  it("drops milestone keys this build does not recognise", () => {
    const model = NuxProgressDBReadToModelReadSchema.parse({
      ...DB_ROW,
      completed_milestones: ["add_dataset", "retired_milestone", "run_query"],
    });
    expect(model.completedMilestones).toEqual(["add_dataset", "run_query"]);
  });
});

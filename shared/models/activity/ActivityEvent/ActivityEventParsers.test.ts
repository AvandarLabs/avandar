import { describe, expect, it } from "vitest";
import { ActivityEventParsers } from "$/models/activity/ActivityEvent/ActivityEvent.ts";

describe("ActivityEventParsers", () => {
  it("reads an edit event and keeps its payload keys as stored", () => {
    const event = ActivityEventParsers.fromDBReadToModelRead({
      actor_user_id: "11111111-1111-4111-8111-111111111111",
      comment_id: "22222222-2222-4222-8222-222222222222",
      id: "33333333-3333-4333-8333-333333333333",
      individual_id: "44444444-4444-4444-8444-444444444444",
      kind: "comment_edited",
      occurred_at: "2026-11-06T10:00:00+00:00",
      payload: { revision_id: "66666666-6666-4666-8666-666666666666" },
      payload_version: 1,
      recorded_at: "2026-11-06T10:00:00+00:00",
      source: "avandar",
      workspace_id: "55555555-5555-4555-8555-555555555555",
    });
    expect(event.kind).toBe("comment_edited");
    expect(event.payload).toEqual({
      revision_id: "66666666-6666-4666-8666-666666666666",
    });
  });
});

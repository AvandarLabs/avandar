import { describe, expect, it } from "vitest";
import {
  ACTIVITY_FEED_VISIBLE_KINDS,
  activityFeedItemRenderers,
} from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/activityFeedItemRenderers";

describe("activityFeedItemRenderers", () => {
  it("draws comment creation as a row and folds edits and deletes into the card", () => {
    expect(activityFeedItemRenderers.comment_created).not.toBeNull();
    expect(activityFeedItemRenderers.comment_edited).toBeNull();
    expect(activityFeedItemRenderers.comment_deleted).toBeNull();
    expect(ACTIVITY_FEED_VISIBLE_KINDS).toEqual(["comment_created"]);
  });
});

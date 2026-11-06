import { describe, expect, it } from "vitest";
import { filterMentionCandidates } from "@/components/RichText/UserMention/filterMentionCandidates";
import type { MentionCandidate } from "@/components/RichText/UserMention/filterMentionCandidates";

const CANDIDATES: MentionCandidate[] = [
  { userId: "1", displayName: "Priya Natarajan", email: "priya.n@example.org" },
  { userId: "2", displayName: "Priscilla Owusu", email: "p.owusu@example.org" },
  { userId: "3", displayName: "Amit Priyadarshi", email: "amit.p@example.org" },
  { userId: "4", displayName: "Dana Whitfield", email: "dana@example.org" },
];

describe("filterMentionCandidates", () => {
  it("matches anywhere in the name, ignoring case", () => {
    expect(
      filterMentionCandidates(CANDIDATES, "pri").map((candidate) => {
        return candidate.userId;
      }),
    ).toEqual(["1", "2", "3"]);
  });

  it("matches on email", () => {
    expect(filterMentionCandidates(CANDIDATES, "dana@")).toHaveLength(1);
  });

  it("returns at most eight people", () => {
    const many = Array.from({ length: 12 }, (_, index) => {
      return {
        userId: String(index),
        displayName: `Person ${index}`,
        email: `p${index}@example.org`,
      };
    });
    expect(filterMentionCandidates(many, "")).toHaveLength(8);
  });
});

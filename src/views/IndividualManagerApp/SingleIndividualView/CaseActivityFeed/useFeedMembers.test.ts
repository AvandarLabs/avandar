import { describe, expect, it } from "vitest";
import { renderHook } from "@/test-utils";
import { useFeedMembers } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/useFeedMembers";
import type { UserProfile } from "$/models/User/UserProfile";

function _member(
  overrides: Readonly<{
    userId: string;
    displayName: string;
    fullName: string;
  }>,
): UserProfile.WithRole {
  return {
    email: `${overrides.userId}@example.org`,
    ...overrides,
  } as UserProfile.WithRole;
}

describe("useFeedMembers", () => {
  it("names a member by display name, then full name, then email", () => {
    const members = [
      _member({ userId: "u1", displayName: "Priya", fullName: "Priya N" }),
      _member({ userId: "u2", displayName: "", fullName: "Luis Romero" }),
      _member({ userId: "u3", displayName: "", fullName: "" }),
    ] as UserProfile.WithRole[];
    const { result } = renderHook(() => {
      return useFeedMembers(members);
    });
    const { membersLookup, mentionCandidates } = result.current;
    expect(membersLookup.getMemberName("u1")).toBe("Priya");
    expect(membersLookup.getMemberName("u2")).toBe("Luis Romero");
    expect(membersLookup.getMemberName("u3")).toBe("u3@example.org");
    expect(mentionCandidates[2]?.displayName).toBe("u3@example.org");
  });
});

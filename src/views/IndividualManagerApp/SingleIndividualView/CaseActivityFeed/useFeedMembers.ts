import { useMemo } from "react";
import type { UserProfile } from "$/models/User/UserProfile";
import type { MentionCandidate } from "@/components/RichText/UserMention/filterMentionCandidates";

type FeedMembers = {
  mentionCandidates: MentionCandidate[];
  membersLookup: {
    getMemberName: (userId: string) => string | undefined;
    isLoadingMembers: boolean;
  };
};

function _toMentionCandidate(member: UserProfile.WithRole): MentionCandidate {
  return {
    userId: member.userId,
    // Fall back to the email so a name and its initials are never blank.
    displayName: member.displayName || member.fullName || member.email,
    email: member.email,
  };
}

/**
 * The workspace's members as mention candidates and a name lookup.
 * `undefined` members are still loading, so no one is a former member yet.
 */
export function useFeedMembers(
  members: readonly UserProfile.WithRole[] | undefined,
): FeedMembers {
  return useMemo(() => {
    const mentionCandidates = (members ?? []).map(_toMentionCandidate);
    const namesById = new Map(
      mentionCandidates.map((candidate) => {
        return [candidate.userId, candidate.displayName];
      }),
    );
    return {
      mentionCandidates,
      membersLookup: {
        getMemberName: (userId: string) => {
          return namesById.get(userId);
        },
        isLoadingMembers: members === undefined,
      },
    };
  }, [members]);
}

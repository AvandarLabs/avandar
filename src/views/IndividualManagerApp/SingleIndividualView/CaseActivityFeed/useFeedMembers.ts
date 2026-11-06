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

/**
 * The workspace's members as mention candidates and a name lookup.
 * `undefined` members are still loading, so no one is a former member yet.
 */
export function useFeedMembers(
  members: readonly UserProfile.WithRole[] | undefined,
): FeedMembers {
  return useMemo(() => {
    const mentionCandidates = (members ?? []).map((member): MentionCandidate => {
      return {
        userId: member.userId,
        displayName: member.displayName || member.fullName,
        email: member.email,
      };
    });
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

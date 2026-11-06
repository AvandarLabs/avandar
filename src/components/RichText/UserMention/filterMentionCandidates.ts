/** A workspace member who can be mentioned. */
export type MentionCandidate = {
  userId: string;
  displayName: string;
  email: string;
};

const MAX_MENTION_CANDIDATES = 8;

/**
 * Members whose name or email contains the typed query, ignoring case, at
 * most eight.
 */
export function filterMentionCandidates(
  candidates: readonly MentionCandidate[],
  query: string,
): MentionCandidate[] {
  const normalizedQuery = query.trim().toLowerCase();
  return candidates
    .filter((candidate) => {
      return (
        candidate.displayName.toLowerCase().includes(normalizedQuery) ||
        candidate.email.toLowerCase().includes(normalizedQuery)
      );
    })
    .slice(0, MAX_MENTION_CANDIDATES);
}

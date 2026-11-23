/** A workspace member who can be mentioned. */
export type MentionCandidate = {
  userId: string;
  displayName: string;
  email: string;
};

/**
 * Members whose name or email contains the typed query, ignoring case, in
 * their original order. The `@` menu caps how many it shows.
 */
export function filterMentionCandidates(
  candidates: readonly MentionCandidate[],
  query: string,
): MentionCandidate[] {
  const normalizedQuery = query.trim().toLowerCase();
  return candidates.filter((candidate) => {
    return (
      candidate.displayName.toLowerCase().includes(normalizedQuery) ||
      candidate.email.toLowerCase().includes(normalizedQuery)
    );
  });
}

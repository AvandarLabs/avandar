/**
 * The reactions a member can leave on a comment, modeled on LinkedIn's set.
 *
 * Enum values:
 *
 * `like` - The default one-click reaction.
 * `celebrate` - Good news.
 * `support` - Solidarity.
 * `love` - Warm appreciation.
 * `insightful` - A useful finding.
 * `funny` - Light humor.
 */
create type public.comment_reactions__kind as enum(
  'like',
  'celebrate',
  'support',
  'love',
  'insightful',
  'funny'
);

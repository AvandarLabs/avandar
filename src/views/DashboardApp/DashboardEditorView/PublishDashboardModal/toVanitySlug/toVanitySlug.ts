/**
 * Kebab-case a user-typed vanity URL fragment. Tracks the rules in
 * `supabase/schemas/10.dashboards.sql` (per-workspace unique `slug text`):
 *
 *   - lowercase
 *   - collapse runs of non-alphanumeric to a single `-`
 *   - trim leading / trailing `-`
 *   - cap at 64 chars (database column is text but we don't want runaways)
 *
 * Returns an empty string when the input collapses to nothing: callers
 * should treat empty-string as "no vanity, publish without a slug".
 */
export function toVanitySlug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

import { makeVanitySlugFromText } from "@/views/DashboardApp/DashboardShareModal/makeVanitySlugFromText/makeVanitySlugFromText";

/**
 * True when the save would retire a live vanity path. The UUID URL always
 * stays valid, so the first time a custom path is set is not a break.
 */
export function doesVanitySlugChangeInvalidatePreviousUrl(
  options: Readonly<{ previousSlug: string; nextSlug: string }>,
): boolean {
  const previousSlug = makeVanitySlugFromText(options.previousSlug);
  const nextSlug = makeVanitySlugFromText(options.nextSlug);
  return previousSlug !== "" && previousSlug !== nextSlug;
}

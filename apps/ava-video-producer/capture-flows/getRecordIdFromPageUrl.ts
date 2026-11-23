import { UUID } from "./captureFlows.constants";
import type { Page } from "@playwright/test";
/**
 * Gets the persisted record ID from the current page URL, after a save
 * navigates to its route. Throws when the URL is not a persisted route for
 * the segment.
 *
 * Use it wherever a flow records the ID of a record it just created or
 * opened, for example a dataset, dashboard, case type, or map.
 */
export function getRecordIdFromPageUrl({
  page,
  segment,
}: Readonly<{
  page: Page;
  segment: string;
}>): string {
  const match = new URL(page.url()).pathname.match(
    new RegExp(`/${segment}/(${UUID})(?:/|$)`),
  );
  if (!match) {
    throw new Error(
      `Expected a persisted ${segment} route after the UI action.`,
    );
  }
  return match[1];
}

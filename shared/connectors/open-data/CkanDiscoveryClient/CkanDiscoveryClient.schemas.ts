import { z } from "zod";

/**
 * `package_search`'s successful result. Each result is left unvalidated here
 * so that one bad dataset is skipped on its own instead of failing the page.
 */
export const CkanPackageSearchResultSchema = z.object({
  results: z.array(z.unknown()),
});

/** The two fields that place a `package_search` result in the sort order. */
export const CkanPackageSearchSortKeySchema = z.object({
  name: z.string().min(1),
  metadata_modified: z.string(),
});

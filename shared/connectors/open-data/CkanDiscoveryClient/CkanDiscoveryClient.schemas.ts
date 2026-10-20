import { CkanPackageSchema } from "$/connectors/open-data/CkanClient/CkanClient.schemas.ts";
import { z } from "zod";

/** `package_list`'s successful result: every dataset slug, unpaginated. */
export const CkanPackageListResultSchema = z.array(z.string());

/** `package_search`'s successful result: the total and one page of datasets. */
export const CkanPackageSearchResultSchema = z.object({
  count: z.number(),
  results: z.array(CkanPackageSchema),
});

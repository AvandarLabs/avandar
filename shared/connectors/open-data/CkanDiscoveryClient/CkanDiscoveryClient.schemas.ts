import { z } from "zod";

/** `package_list`'s successful result: every dataset slug, unpaginated. */
export const CkanPackageListResultSchema = z.array(z.string());

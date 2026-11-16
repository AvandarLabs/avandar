import { getOrganizationLabelsFromDrive } from "@avandar/etl";
import { z } from "zod";
import type {
  EtlOrganizationLabels,
  EtlScope,
  PipelineConfig,
} from "@avandar/etl";

/**
 * One Socrata scope, with `categories` and `tags` spelled as the portal
 * names them. The Discovery API ORs the values within one filter and ANDs
 * the filters, so a scope with both matches the datasets that are in one of
 * the `categories` and also carry one of the `tags`. A scope with neither,
 * or with only empty lists, is the whole drive.
 */
export type SocrataScope = EtlScope &
  Readonly<{ categories?: readonly string[]; tags?: readonly string[] }>;

/**
 * One Socrata portal (drive) the pipeline enumerates, from its config. No
 * `apiService` field: every drive here already speaks Socrata by
 * construction, because Socrata genuinely is one federated service with many
 * portals underneath it - see `connector-nomenclature.md`'s "One pipeline
 * per service" section.
 */
export type ConfiguredDrive = Readonly<{
  /** No trailing slash, always `https://`. */
  baseUrl: string;
  /** What each organization level is called on this portal. */
  organizationLabels: EtlOrganizationLabels;
  /**
   * The drive's scopes, crawled in this order. Omit to index the whole
   * portal as one scope, `all`. Replacing `all` with category or tag scopes
   * retires `all`, and `ava pipeline prune-retired-scopes` then removes the
   * datasets outside them.
   */
  scopes?: readonly SocrataScope[];
}>;

const SocrataScopesSchema = z.array(
  z.strictObject({
    key: z.string(),
    categories: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
  }),
);

/**
 * The drives `socrata.pipeline.yaml` lists, with each drive's labels
 * resolved and its `scopes` validated as Socrata scopes.
 *
 * @param config - The parsed Socrata pipeline config.
 * @returns The drives, in config order.
 * @throws When a drive's `scopes` is not a list of Socrata scopes.
 */
export function listConfiguredDrives(
  config: PipelineConfig,
): readonly ConfiguredDrive[] {
  return config.drives.map((drive) => {
    const scopes =
      drive.scopes === undefined
        ? undefined
        : SocrataScopesSchema.parse(drive.scopes);
    return {
      baseUrl: drive.baseUrl,
      organizationLabels: getOrganizationLabelsFromDrive({ config, drive }),
      ...(scopes === undefined ? {} : { scopes }),
    };
  });
}

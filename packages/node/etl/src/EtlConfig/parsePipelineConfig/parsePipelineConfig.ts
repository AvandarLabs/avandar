import { parse } from "yaml";
import { z } from "zod";
import {
  CATALOG_MAPPABLE_FIELDS,
  REQUIRED_CATALOG_FIELD,
} from "@etl/EtlConfig/PipelineConfig.types";
import type { PipelineConfig } from "@etl/EtlConfig/PipelineConfig.types";

/** Dotted segments of letters, digits, `_`, and `-`, such as `a.b.0`. */
const FIELD_PATH_PATTERN = /^[\w-]+(\.[\w-]+)*$/;

const FieldSourceSchema = z.union(
  [
    z.strictObject({ from: z.string().regex(FIELD_PATH_PATTERN) }),
    z.strictObject({
      value: z.union([
        z.string().min(1),
        z.array(z.string().min(1)).min(1),
      ]),
    }),
    z.strictObject({ script: z.string().min(1) }),
  ],
  { error: "must set exactly one of from, value, or script" },
);

const FieldMappingsSchema = z.partialRecord(
  z.enum(CATALOG_MAPPABLE_FIELDS),
  FieldSourceSchema,
);

const OrganizationLabelsSchema = z.strictObject({
  1: z.string().min(1).optional(),
  2: z.string().min(1).optional(),
  3: z.string().min(1).optional(),
  4: z.string().min(1).optional(),
});

const BaseUrlSchema = z
  .string()
  .startsWith("https://", { error: "baseUrl must start with https://" })
  .refine(
    (baseUrl) => {
      return !baseUrl.endsWith("/");
    },
    { error: "baseUrl must not end with /" },
  );

const FormatListSchema = z.array(z.string());

const PipelineConfigSchema = z.strictObject({
  organizationLabels: OrganizationLabelsSchema.optional(),
  fields: FieldMappingsSchema.optional(),
  drives: z.array(
    z.strictObject({
      baseUrl: BaseUrlSchema,
      organizationLabels: OrganizationLabelsSchema.optional(),
      fields: FieldMappingsSchema.optional(),
      scopes: z.unknown().optional(),
    }),
  ),
  workspaceLoadability: z
    .strictObject({
      loadableFormats: FormatListSchema.optional(),
      unloadableFormats: FormatListSchema.optional(),
    })
    .optional(),
});

/**
 * Throws when a drive maps no `organization1_name`, through its own fields
 * or the pipeline's, or when two drives share a `baseUrl`.
 */
function _assertValidDrives(config: PipelineConfig, sourceName: string): void {
  const seenBaseUrls = new Set<string>();
  config.drives.forEach((drive) => {
    if (seenBaseUrls.has(drive.baseUrl)) {
      throw new Error(
        `${sourceName}: Drive ${drive.baseUrl} is listed twice.`,
      );
    }
    seenBaseUrls.add(drive.baseUrl);
    const mergedFields = { ...config.fields, ...drive.fields };
    if (mergedFields[REQUIRED_CATALOG_FIELD] === undefined) {
      throw new Error(
        `${sourceName}: Drive ${drive.baseUrl} does not map ${REQUIRED_CATALOG_FIELD}, in its own fields or the pipeline's.`,
      );
    }
  });
}

/**
 * Parses one pipeline's config from YAML (see `PipelineConfig`). Unknown
 * keys, unmappable fields, and mappings with zero or two sources are
 * refused, so a typo fails the run before any network call rather than
 * silently leaving a field empty.
 *
 * @param args.yamlText - The file's contents.
 * @param args.sourceName - Names the file in error messages.
 * @returns The config.
 * @throws When the YAML does not parse, does not match the config's shape,
 * lists a drive twice, or has a drive that maps no `organization1_name`.
 */
export function parsePipelineConfig(args: {
  yamlText: string;
  sourceName: string;
}): PipelineConfig {
  const rawConfig: unknown = parse(args.yamlText) ?? {};
  const parsed = PipelineConfigSchema.safeParse(rawConfig);
  if (!parsed.success) {
    throw new Error(
      `${args.sourceName} is not a valid pipeline config: ${z.prettifyError(parsed.error)}`,
    );
  }
  _assertValidDrives(parsed.data, args.sourceName);
  return parsed.data;
}

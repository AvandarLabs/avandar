import {
  CATALOG_MAPPABLE_FIELDS,
  REQUIRED_CATALOG_FIELD,
} from "@etl/EtlConfig/PipelineConfig.types";
import { parse } from "yaml";
import { z } from "zod";
import type { PipelineConfig } from "@etl/EtlConfig/PipelineConfig.types";

/** Dotted segments of letters, digits, `_`, and `-`, such as `a.b.0`. */
const FIELD_PATH_PATTERN = /^[\w-]+(\.[\w-]+)*$/;

/**
 * Whether a mapping is exactly `{ value: ... }` with something that is
 * neither text nor a list. YAML reads `2024` and `true` as a number and a
 * boolean, so this is the one way a `value` source is set yet refused.
 */
function _isNonTextValueSource(input: unknown): boolean {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return false;
  }
  const keys = Object.keys(input);
  if (keys.length !== 1 || keys[0] !== "value") {
    return false;
  }
  const { value } = input as { value: unknown };
  return typeof value !== "string" && !Array.isArray(value);
}

const FieldSourceSchema = z.union(
  [
    z.strictObject({ from: z.string().regex(FIELD_PATH_PATTERN) }),
    z.strictObject({
      value: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]),
    }),
    z.strictObject({ script: z.string().min(1) }),
  ],
  {
    error: (issue) => {
      if (_isNonTextValueSource(issue.input)) {
        return "value must be text or a list of text. Quote a number or boolean so YAML reads it as text";
      }
      return "must set exactly one of from, value, or script";
    },
  },
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
      throw new Error(`${sourceName}: Drive ${drive.baseUrl} is listed twice.`);
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
 * Parses YAML text, naming the file when the YAML itself is malformed.
 * An empty document reads as an empty object.
 */
function _parseYaml(args: { yamlText: string; sourceName: string }): unknown {
  try {
    return parse(args.yamlText) ?? {};
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${args.sourceName} is not valid YAML: ${message}`, {
      cause: error,
    });
  }
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
 * @throws When the YAML is malformed (the error names the file and keeps the
 * YAML library's error as `cause`), the config does not match its shape,
 * a drive is listed twice, or a drive maps no `organization1_name`.
 */
export function parsePipelineConfig(args: {
  yamlText: string;
  sourceName: string;
}): PipelineConfig {
  const rawConfig = _parseYaml(args);
  const parsed = PipelineConfigSchema.safeParse(rawConfig);
  if (!parsed.success) {
    throw new Error(
      `${args.sourceName} is not a valid pipeline config: ${z.prettifyError(parsed.error)}`,
    );
  }
  _assertValidDrives(parsed.data, args.sourceName);
  return parsed.data;
}

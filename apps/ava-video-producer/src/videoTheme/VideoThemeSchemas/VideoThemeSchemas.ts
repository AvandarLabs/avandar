import { makeObjectFromEntries } from "@avandar/utils";
import { z } from "zod";
import {
  colorValueSchema,
  makeValueSchemaFromDefinition,
  gradientValueSchema,
} from "../makeValueSchemaFromDefinition";
import { TOKEN_REFERENCE_PATTERN } from "../ThemeReferences/ThemeReferences";
import { VIDEO_TOKEN_CATALOG } from "../tokenCatalog/TokenCatalog/TokenCatalog";
import {
  COMPOSITE_TOKEN_FIELDS,
  TOKEN_CONTROLS,
  type CompositeTokenKind,
  type FieldSpec,
  TokenDefinitions,
} from "../tokenCatalog/TokenDefinitions";
import type {
  CatalogGroup,
  CatalogNode,
  TokenDefinition,
  VideoThemeDocument,
} from "../videoTheme.types";
/** Theme ids: 1 to 48 lowercase letters, digits, or hyphens. */
export const VIDEO_THEME_SLUG_PATTERN = /^[a-z0-9-]{1,48}$/;
/** Largest serialized theme, or theme snapshot, any surface accepts. */
export const VIDEO_THEME_MAX_BYTES = 256 * 1024;
type SchemaTier = "mantine" | "atomic" | "semantic" | "component";
const tokenReferenceSchema = z
  .string()
  .regex(
    TOKEN_REFERENCE_PATTERN,
    "Expected a token reference such as $atomic.strokeWidth.sm",
  );
const slugSchema = z
  .string()
  .regex(
    VIDEO_THEME_SLUG_PATTERN,
    "Theme ids are 1 to 48 lowercase letters, digits, or hyphens",
  );
const scaleKeySchema = z
  .string()
  .regex(/^[A-Za-z0-9]{1,32}$/, "Scale keys are letters and digits");
/** Gets alternate surface color schemas for a theme token definition. */
function _getColorPairSchemas({
  definition,
  tier,
}: Readonly<{ definition: TokenDefinition; tier: SchemaTier }>): z.ZodType[] {
  return definition.kind === "color"
    ? [
        z.strictObject({
          onDark: _fieldSchema({
            field: definition,
            tier,
          }),
          onLight: _fieldSchema({
            field: definition,
            tier,
          }),
        }),
      ]
    : [];
}

function _union(options: readonly z.ZodType[]): z.ZodType {
  const [onlyOption] = options;
  return options.length === 1 && onlyOption !== undefined
    ? onlyOption
    : z.union(options);
}
function _fieldSchema({
  field,
  tier,
}: Readonly<{
  field: FieldSpec;
  tier: SchemaTier;
}>): z.ZodType {
  const literal = makeValueSchemaFromDefinition(field);
  return field.kind === "enum" && literal
    ? literal
    : tier === "component" && literal
      ? _union([literal, tokenReferenceSchema])
      : tokenReferenceSchema;
}
function _compositeSchema({
  kind,
  tier,
}: Readonly<{
  kind: CompositeTokenKind;
  tier: SchemaTier;
}>): z.ZodType {
  const spec = COMPOSITE_TOKEN_FIELDS[kind];
  const required = new Set<string>(spec.required);
  const fields: Readonly<Record<string, FieldSpec>> = spec.fields;
  const shape = makeObjectFromEntries(
    Object.entries(fields).map(([name, field]) => {
      const schema = _fieldSchema({
        field,
        tier,
      });
      return [name, required.has(name) ? schema : schema.optional()];
    }),
  );
  return _union([z.strictObject(shape), tokenReferenceSchema]);
}
function _leafSchema({
  definition,
  tier,
}: Readonly<{
  definition: TokenDefinition;
  tier: SchemaTier;
}>): z.ZodType {
  const literal = makeValueSchemaFromDefinition(definition);
  if (tier === "mantine" || tier === "atomic") {
    return literal ?? z.never();
  }
  if (
    (definition.kind === "enum" || definition.kind === "boolean") &&
    literal
  ) {
    return literal;
  }
  if (TokenDefinitions.isCompositeTokenKind(definition.kind)) {
    return _compositeSchema({
      kind: definition.kind,
      tier,
    });
  }
  const componentLiteral =
    definition.kind === "fill"
      ? _union([colorValueSchema, gradientValueSchema])
      : literal;
  const colorPair = _getColorPairSchemas({ definition, tier });
  return _union([
    tokenReferenceSchema,
    ...(tier === "component" && componentLiteral ? [componentLiteral] : []),
    ...colorPair,
  ]);
}
function _tokenMeta(definition: TokenDefinition): {
  title: string;
  description: string;
  control: string;
  unit?: string;
  surface?: string;
} {
  return {
    title: definition.label,
    description: definition.description,
    control: TOKEN_CONTROLS[definition.kind],
    ...(definition.unit ? { unit: definition.unit } : {}),
    ...(definition.surface ? { surface: definition.surface } : {}),
  };
}
function _nodeSchema({
  node,
  tier,
  isComplete,
}: Readonly<{
  node: CatalogNode;
  tier: SchemaTier;
  isComplete: boolean;
}>): z.ZodType {
  if (TokenDefinitions.isTokenDefinition(node)) {
    return _leafSchema({
      definition: node,
      tier,
    }).meta(_tokenMeta(node));
  }
  return TokenDefinitions.isTokenScale(node)
    ? z.record(
        scaleKeySchema,
        _leafSchema({
          definition: node.scale,
          tier,
        }).meta(_tokenMeta(node.scale)),
      )
    : z.strictObject(
        _shape({
          group: node,
          tier,
          isComplete,
        }),
      );
}
function _shape({
  group,
  tier,
  isComplete,
}: Readonly<{
  group: CatalogGroup;
  tier: SchemaTier;
  isComplete: boolean;
}>): Record<string, z.ZodType> {
  return makeObjectFromEntries(
    Object.entries(group).map(([key, child]) => {
      const schema = _nodeSchema({
        node: child,
        tier,
        isComplete,
      });
      const isRequired =
        isComplete &&
        !(TokenDefinitions.isTokenDefinition(child) && child.isOptional);
      return [key, isRequired ? schema : schema.optional()];
    }),
  );
}
function _componentsSchema(isComplete: boolean): z.ZodType {
  const shape = makeObjectFromEntries(
    Object.entries(VIDEO_TOKEN_CATALOG.components).map(([name, group]) => {
      const schema = z.strictObject({
        defaultProps: _nodeSchema({
          node: group,
          tier: "component",
          isComplete,
        }),
      });
      return [name, isComplete ? schema : schema.optional()];
    }),
  );
  return z.strictObject(shape);
}
function _themeShape(isComplete: boolean): Record<string, z.ZodType> {
  const optional = (schema: z.ZodType) => {
    return isComplete ? schema : schema.optional();
  };
  const video = z.strictObject({
    atomic: optional(
      _nodeSchema({
        node: VIDEO_TOKEN_CATALOG.atomic,
        tier: "atomic",
        isComplete,
      }),
    ),
    semantic: optional(
      _nodeSchema({
        node: VIDEO_TOKEN_CATALOG.semantic,
        tier: "semantic",
        isComplete,
      }),
    ),
  });
  return {
    ..._shape({
      group: VIDEO_TOKEN_CATALOG.mantine,
      tier: "mantine",
      isComplete,
    }),
    other: optional(z.strictObject({ video: optional(video) })),
    components: optional(_componentsSchema(isComplete)),
  };
}
/** A sparse fragment: what a per-item override or an unsaved draft holds. */
export const videoThemePatchSchema = z.strictObject(_themeShape(false));
function _documentSchema(isComplete: boolean): z.ZodObject<
  {
    $schema: z.ZodOptional<z.ZodString>;
    schemaVersion: z.ZodLiteral<1>;
    id: z.ZodString;
    label: z.ZodString;
    extends: z.ZodOptional<z.ZodString>;
    overrides: z.ZodOptional<
      z.ZodRecord<z.ZodString, typeof videoThemePatchSchema>
    >;
  },
  z.core.$strict
> {
  return z.strictObject({
    $schema: z.string().optional(),
    schemaVersion: z.literal(1),
    id: slugSchema,
    label: z.string().trim().min(1).max(80),
    extends: slugSchema.optional(),
    ..._themeShape(isComplete),
    overrides: z.record(slugSchema, videoThemePatchSchema).optional(),
  });
}
const SPARSE_DOCUMENT_SCHEMA = _documentSchema(false);
const COMPLETE_DOCUMENT_SCHEMA = _documentSchema(true);
/**
 * A theme file as a schema, for composing into larger messages. It applies
 * the same rule as `parseVideoThemeDocument`: a theme without `extends` must
 * define every token.
 */
export const videoThemeDocumentSchema = SPARSE_DOCUMENT_SCHEMA.superRefine(
  (document, context) => {
    if (document.extends !== undefined) {
      return;
    }
    const result = COMPLETE_DOCUMENT_SCHEMA.safeParse(document);
    result.error?.issues.forEach((issue) => {
      context.addIssue({
        code: "custom",
        path: issue.path,
        message: issue.message,
      });
    });
  },
);
/**
 * Validates a theme file. A theme that names `extends` may be sparse; a
 * theme without it must define every token, so it can stand alone. Throws a
 * `ZodError` whose issue paths name the offending tokens. Use it before
 * resolving or saving any theme that did not come from this process.
 */
function _parseVideoThemeDocument(value: unknown): VideoThemeDocument {
  const document = SPARSE_DOCUMENT_SCHEMA.parse(value);
  if (document.extends === undefined) {
    COMPLETE_DOCUMENT_SCHEMA.parse(value);
  }
  return document;
}
/**
 * The JSON Schema for theme files, with every token's label, description,
 * unit, surface, and editor control. Served to theme generators such as
 * `/impeccable` so they can write valid themes without reading this code.
 */
function _makeJsonSchema(): Record<string, unknown> {
  return z.toJSONSchema(SPARSE_DOCUMENT_SCHEMA);
}

/** Validates authored theme documents and describes their JSON schema. */
export const VideoThemeSchemas = {
  /** Validates a theme file. */
  parseVideoThemeDocument: _parseVideoThemeDocument,
  /**
   * The JSON Schema for theme files, with every token's label, description,
   * unit, surface, and editor control.
   */
  makeJsonSchema: _makeJsonSchema,
};

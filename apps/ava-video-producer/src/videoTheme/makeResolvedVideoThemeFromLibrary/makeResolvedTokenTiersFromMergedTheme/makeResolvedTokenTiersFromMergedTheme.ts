import { luminance, type MantineTheme } from "@mantine/core";
import { getValueAtPath } from "../../getValueAtPath";
import { normalizeTokenValue } from "../../normalizeTokenValue/normalizeTokenValue";
import {
  getTargetFromTokenReference,
  isTokenReference,
} from "../../themeReferenceHelpers/themeReferenceHelpers";
import {
  COMPOSITE_TOKEN_FIELDS,
  isCompositeTokenKind,
  isTokenDefinition,
  isTokenScale,
  type CompositeTokenKind,
  type FieldSpec,
} from "../../tokenCatalog/defineTokensHelpers";
import { VIDEO_TOKEN_CATALOG } from "../../tokenCatalog/tokenCatalogHelpers/tokenCatalogHelpers";
import {
  VIDEO_FONT_REGISTRY,
  type VideoFontId,
} from "../../videoFontRegistry/videoFontRegistryHelpers";
import { ResolvedShadowScaling } from "./ResolvedShadowScaling";
import { ResolvedTokenGuards } from "./ResolvedTokenGuards";
import {
  type ResolutionContext,
  type UnknownRecord,
  type PickPairByContrastColorOptions,
  type BuildTokenFromDefinitionOptions,
  type ResolvedTokenTiers,
} from "./ResolvedTokenTiers.types";
import type {
  CatalogNode,
  GlowValue,
  TextShadowValue,
  TokenReference,
  VideoThemeIssue,
  VideoThemePatch,
} from "../../videoTheme.types";

function _primaryColor(context: ResolutionContext): unknown {
  const shade = context.mantine.primaryShade;
  const index =
    typeof shade === "number"
      ? shade
      : context.isDarkGround
        ? shade.dark
        : shade.light;
  return context.mantine.colors[context.mantine.primaryColor]?.[index];
}
function _lookup(
  context: ResolutionContext,
  reference: TokenReference,
): unknown {
  const target = getTargetFromTokenReference(reference);
  if (target.tier === "primary") {
    return _primaryColor(context);
  }
  const source =
    target.tier === "mantine"
      ? context.mantine
      : target.tier === "atomic"
        ? context.atomic
        : context.semantic;
  return getValueAtPath(source, target.path);
}
function _buildValueFromReference(
  context: ResolutionContext,
  reference: TokenReference,
  field: FieldSpec,
  path: string,
  stack: readonly string[],
): unknown {
  if (stack.includes(reference)) {
    context.issues.push({
      path,
      message: `Reference cycle: ${[...stack, reference].join(" → ")}`,
    });
    return undefined;
  }
  const target = _lookup(context, reference);
  if (target === undefined) {
    context.issues.push({
      path,
      message: `${reference} does not point at a token`,
    });
    return undefined;
  }
  return _buildValueFromRaw(context, target, field, path, [
    ...stack,
    reference,
  ]);
}
function _buildValueFromRaw(
  context: ResolutionContext,
  raw: unknown,
  field: FieldSpec,
  path: string,
  stack: readonly string[],
): unknown {
  if (isTokenReference(raw)) {
    return _buildValueFromReference(context, raw, field, path, stack);
  }
  if (field.kind === "color" && ResolvedTokenGuards.isColorPair(raw)) {
    if (context.forbidColorPairs) {
      context.issues.push({
        path,
        message: "The ground colour cannot depend on the ground",
      });
      return undefined;
    }
    return _buildValueFromRaw(
      context,
      context.isDarkGround ? raw.onDark : raw.onLight,
      field,
      path,
      stack,
    );
  }
  if (isCompositeTokenKind(field.kind)) {
    return _buildCompositeFromFields(context, field.kind, raw, path, stack);
  }
  const normalized = normalizeTokenValue(field, raw);
  if (!normalized.ok) {
    context.issues.push({ path, message: normalized.message });
    return undefined;
  }
  return normalized.value;
}
function _finishTypeStyle(fields: UnknownRecord): unknown {
  const fontId = fields.family as VideoFontId | undefined;
  if (fontId === undefined) {
    return undefined;
  }
  const color = fields.color as string;
  const textShadow = fields.textShadow as TextShadowValue | undefined;
  const glow = fields.glow as GlowValue | undefined;
  return {
    fontId,
    fontFamily: VIDEO_FONT_REGISTRY[fontId].stack,
    fontSize: fields.size,
    fontWeight: fields.weight,
    ...(fields.lineHeight === undefined
      ? {}
      : { lineHeight: fields.lineHeight }),
    ...(fields.letterSpacing === undefined
      ? {}
      : { letterSpacing: fields.letterSpacing }),
    ...(fields.transform === undefined
      ? {}
      : { textTransform: fields.transform }),
    ...(fields.numeric === undefined
      ? {}
      : { fontVariantNumeric: fields.numeric }),
    color,
    alpha: fields.alpha ?? 1,
    ...(textShadow ? { textShadow: { ...textShadow, color } } : {}),
    ...(glow ? { glow: { ...glow, color } } : {}),
    ...(fields.stroke === undefined ? {} : { strokeWidth: fields.stroke }),
  };
}
function _buildCompositeFromFields(
  context: ResolutionContext,
  kind: CompositeTokenKind,
  raw: unknown,
  path: string,
  stack: readonly string[],
): unknown {
  if (!ResolvedTokenGuards.isRecord(raw)) {
    context.issues.push({ path, message: `Expected a ${kind}` });
    return undefined;
  }
  const spec = COMPOSITE_TOKEN_FIELDS[kind];
  const required = new Set<string>(spec.required);
  const fields: Readonly<Record<string, FieldSpec>> = spec.fields;
  const resolved = Object.fromEntries(
    Object.entries(fields).flatMap(([name, field]) => {
      if (raw[name] === undefined) {
        if (required.has(name)) {
          context.issues.push({ path: `${path}.${name}`, message: "Missing" });
        }
        return [];
      }
      return [
        [
          name,
          _buildValueFromRaw(
            context,
            raw[name],
            field,
            `${path}.${name}`,
            stack,
          ),
        ],
      ];
    }),
  );
  if (kind === "typeStyle") {
    return _finishTypeStyle(resolved);
  }
  return kind === "elevation"
    ? ResolvedShadowScaling.finishElevation(resolved)
    : resolved;
}
/**
 * The pair value a colour token picks by another colour's luminance, such as
 * text on the accent, instead of by the ground's.
 */
function _pickPairByContrastColor({
  context,
  definition,
  raw,
  path,
}: Readonly<PickPairByContrastColorOptions>): unknown {
  const contrastPath = definition.contrastWith ?? "";
  const contrastColor = _buildValueFromRaw(
    context,
    getValueAtPath(context.semantic, contrastPath.split(".")),
    { kind: "color" },
    contrastPath,
    [path],
  );
  if (typeof contrastColor !== "string") {
    return undefined;
  }
  return luminance(contrastColor) > (definition.contrastThreshold ?? 0.5)
    ? raw.onLight
    : raw.onDark;
}
function _buildTokenFromDefinition({
  context,
  definition,
  raw,
  path,
}: Readonly<BuildTokenFromDefinitionOptions>): unknown {
  if (raw === undefined) {
    if (!definition.isOptional) {
      context.issues.push({ path, message: "Missing token" });
    }
    return undefined;
  }
  if (
    definition.contrastWith !== undefined &&
    ResolvedTokenGuards.isColorPair(raw)
  ) {
    const picked = _pickPairByContrastColor({ context, definition, raw, path });
    return picked === undefined
      ? undefined
      : _buildValueFromRaw(context, picked, definition, path, []);
  }
  return _buildValueFromRaw(context, raw, definition, path, []);
}
function _buildNodeFromCatalog(
  context: ResolutionContext,
  node: CatalogNode,
  raw: unknown,
  path: string,
): unknown {
  if (isTokenDefinition(node)) {
    return _buildTokenFromDefinition({ context, definition: node, raw, path });
  }
  if (isTokenScale(node)) {
    const entries = ResolvedTokenGuards.isRecord(raw)
      ? Object.entries(raw)
      : [];
    return Object.fromEntries(
      entries.map(([key, value]) => {
        return [
          key,
          _buildValueFromRaw(context, value, node.scale, `${path}.${key}`, []),
        ];
      }),
    );
  }
  return Object.fromEntries(
    Object.entries(node).map(([key, child]) => {
      return [
        key,
        _buildNodeFromCatalog(
          context,
          child,
          ResolvedTokenGuards.isRecord(raw) ? raw[key] : undefined,
          path ? `${path}.${key}` : key,
        ),
      ];
    }),
  );
}
function _buildComponentsFromCatalog(context: ResolutionContext): unknown {
  return Object.fromEntries(
    Object.entries(VIDEO_TOKEN_CATALOG.components).map(([name, group]) => {
      return [
        name,
        _buildNodeFromCatalog(
          context,
          group,
          getValueAtPath(context.components, [name, "defaultProps"]),
          `components.${name}`,
        ),
      ];
    }),
  );
}
/** The context that resolves the ground colour, before the ground is known. */
function _createGroundContext({
  options,
  issues,
}: Readonly<{
  options: Readonly<{
    merged: VideoThemePatch;
    mantine: MantineTheme;
  }>;
  issues: VideoThemeIssue[];
}>): ResolutionContext {
  const video = getValueAtPath(options.merged, ["other", "video"]);
  return {
    atomic: getValueAtPath(video, ["atomic"]),
    semantic: getValueAtPath(video, ["semantic"]),
    components: options.merged.components,
    mantine: options.mantine,
    isDarkGround: true,
    forbidColorPairs: true,
    issues,
  };
}
function _isGroundDark(groundContext: ResolutionContext): boolean {
  const ground = _buildValueFromRaw(
    groundContext,
    getValueAtPath(groundContext.semantic, ["color", "ground"]),
    { kind: "color" },
    "color.ground",
    [],
  );
  return typeof ground === "string"
    ? luminance(ground) < groundContext.mantine.luminanceThreshold
    : true;
}
/**
 * Resolves every catalog token of a merged theme: follows `$` references,
 * picks `{ onDark, onLight }` colours by the ground's luminance (or by the
 * colour a token names in `contrastWith`), fills composite tokens, converts
 * Mantine CSS strings to numbers, and applies `elevation.strength` to every
 * shadow. Collects issues instead of throwing so one pass reports every
 * problem.
 */
export function makeResolvedTokenTiersFromMergedTheme(
  options: Readonly<{
    merged: VideoThemePatch;
    mantine: MantineTheme;
  }>,
): ResolvedTokenTiers {
  const issues: VideoThemeIssue[] = [];
  const groundContext = _createGroundContext({ options, issues });
  const isDarkGround = _isGroundDark(groundContext);
  const context: ResolutionContext = {
    ...groundContext,
    isDarkGround,
    forbidColorPairs: false,
  };
  const semantic = _buildNodeFromCatalog(
    context,
    VIDEO_TOKEN_CATALOG.semantic,
    context.semantic,
    "",
  );
  const components = _buildComponentsFromCatalog(context);
  const strength = ResolvedShadowScaling.getShadowStrength(semantic);
  return {
    atomic: _buildNodeFromCatalog(
      context,
      VIDEO_TOKEN_CATALOG.atomic,
      context.atomic,
      "atomic",
    ),
    semantic: ResolvedShadowScaling.scaleShadowsByStrength({
      node: VIDEO_TOKEN_CATALOG.semantic,
      value: semantic,
      strength,
    }),
    components: ResolvedShadowScaling.scaleShadowsByStrength({
      node: VIDEO_TOKEN_CATALOG.components,
      value: components,
      strength,
    }),
    isDarkGround,
    issues,
  };
}

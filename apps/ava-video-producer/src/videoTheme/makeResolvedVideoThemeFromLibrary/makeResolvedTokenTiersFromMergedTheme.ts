import { luminance, type MantineTheme } from "@mantine/core";
import { getValueAtPath } from "../getValueAtPath";
import { normalizeTokenValue } from "../normalizeTokenValue/normalizeTokenValue";
import {
  getTargetFromTokenReference,
  isTokenReference,
} from "../themeReferenceHelpers/themeReferenceHelpers";
import {
  COMPOSITE_TOKEN_FIELDS,
  isCompositeTokenKind,
  isTokenDefinition,
  isTokenScale,
  type CompositeTokenKind,
  type FieldSpec,
} from "../tokenCatalog/defineTokensHelpers";
import { VIDEO_TOKEN_CATALOG } from "../tokenCatalog/tokenCatalogHelpers";
import {
  VIDEO_FONT_REGISTRY,
  type VideoFontId,
} from "../videoFontRegistry/videoFontRegistryHelpers";
import type {
  CatalogNode,
  GlowValue,
  TokenDefinition,
  TextShadowValue,
  TokenReference,
  VideoThemeIssue,
  VideoThemePatch,
} from "../videoTheme.types";

type ResolutionContext = Readonly<{
  atomic: unknown;
  semantic: unknown;
  components: unknown;
  mantine: MantineTheme;
  isDarkGround: boolean;
  /**
   * True while resolving the ground itself, which cannot depend on the ground.
   */
  forbidColorPairs: boolean;
  issues: VideoThemeIssue[];
}>;

/** Resolved tiers of one merged theme, plus every problem found on the way. */
export type ResolvedTokenTiers = Readonly<{
  atomic: unknown;
  semantic: unknown;
  components: unknown;
  isDarkGround: boolean;
  issues: readonly VideoThemeIssue[];
}>;

type UnknownRecord = Readonly<Record<string, unknown>>;

function _isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function _isColorPair(
  value: unknown,
): value is Readonly<{ onDark: unknown; onLight: unknown }> {
  return _isRecord(value) && "onDark" in value && "onLight" in value;
}

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
  if (field.kind === "color" && _isColorPair(raw)) {
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

function _finishElevation(fields: UnknownRecord): unknown {
  const shadow = fields.shadow;
  if (!_isRecord(shadow) || fields.color === undefined) {
    return undefined;
  }
  return { layers: shadow.layers, color: fields.color };
}

function _buildCompositeFromFields(
  context: ResolutionContext,
  kind: CompositeTokenKind,
  raw: unknown,
  path: string,
  stack: readonly string[],
): unknown {
  if (!_isRecord(raw)) {
    context.issues.push({ path, message: `Expected a ${kind}` });
    return undefined;
  }
  const spec = COMPOSITE_TOKEN_FIELDS[kind];
  const required: readonly string[] = spec.required;
  const fields: Readonly<Record<string, FieldSpec>> = spec.fields;
  const resolved = Object.fromEntries(
    Object.entries(fields).flatMap(([name, field]) => {
      if (raw[name] === undefined) {
        if (required.includes(name)) {
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
  return kind === "elevation" ? _finishElevation(resolved) : resolved;
}

/**
 * The pair value a colour token picks by another colour's luminance, such as
 * text on the accent, instead of by the ground's.
 */
function _pickPairByContrastColor(
  context: ResolutionContext,
  definition: TokenDefinition,
  raw: Readonly<{ onDark: unknown; onLight: unknown }>,
  path: string,
): unknown {
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

function _buildTokenFromDefinition(
  context: ResolutionContext,
  definition: TokenDefinition,
  raw: unknown,
  path: string,
): unknown {
  if (raw === undefined) {
    if (!definition.isOptional) {
      context.issues.push({ path, message: "Missing token" });
    }
    return undefined;
  }
  if (definition.contrastWith !== undefined && _isColorPair(raw)) {
    const picked = _pickPairByContrastColor(context, definition, raw, path);
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
    return _buildTokenFromDefinition(context, node, raw, path);
  }
  if (isTokenScale(node)) {
    const entries = _isRecord(raw) ? Object.entries(raw) : [];
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
          _isRecord(raw) ? raw[key] : undefined,
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

/**
 * Every resolved shadow and elevation under a catalog node with its layer
 * opacities multiplied by `strength`, so `elevation.strength` reaches every
 * shadow a renderer reads. Values come back unchanged at strength 1.
 */
function _scaleShadows(
  node: CatalogNode,
  value: unknown,
  strength: number,
): unknown {
  if (isTokenScale(node) || !_isRecord(value)) {
    return value;
  }
  if (isTokenDefinition(node)) {
    if (
      (node.kind !== "elevation" && node.kind !== "shadow") ||
      !Array.isArray(value.layers)
    ) {
      return value;
    }
    const layers: ReadonlyArray<Readonly<{ alpha: number }>> = value.layers;
    return {
      ...value,
      layers: layers.map((layer) => {
        return { ...layer, alpha: Math.min(1, layer.alpha * strength) };
      }),
    };
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => {
      const childNode = node[key];
      return [
        key,
        childNode ? _scaleShadows(childNode, child, strength) : child,
      ];
    }),
  );
}

function _getShadowStrength(semantic: unknown): number {
  const strength = getValueAtPath(semantic, ["elevation", "strength"]);
  return typeof strength === "number" ? strength : 1;
}

/** `_scaleShadows`, skipped at strength 1 so the value is returned as is. */
function _scaleShadowsByStrength(
  node: CatalogNode,
  value: unknown,
  strength: number,
): unknown {
  return strength === 1 ? value : _scaleShadows(node, value, strength);
}

/** The context that resolves the ground colour, before the ground is known. */
function _createGroundContext(
  options: Readonly<{ merged: VideoThemePatch; mantine: MantineTheme }>,
  issues: VideoThemeIssue[],
): ResolutionContext {
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
  options: Readonly<{ merged: VideoThemePatch; mantine: MantineTheme }>,
): ResolvedTokenTiers {
  const issues: VideoThemeIssue[] = [];
  const groundContext = _createGroundContext(options, issues);
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
  const strength = _getShadowStrength(semantic);
  return {
    atomic: _buildNodeFromCatalog(
      context,
      VIDEO_TOKEN_CATALOG.atomic,
      context.atomic,
      "atomic",
    ),
    semantic: _scaleShadowsByStrength(
      VIDEO_TOKEN_CATALOG.semantic,
      semantic,
      strength,
    ),
    components: _scaleShadowsByStrength(
      VIDEO_TOKEN_CATALOG.components,
      components,
      strength,
    ),
    isDarkGround,
    issues,
  };
}

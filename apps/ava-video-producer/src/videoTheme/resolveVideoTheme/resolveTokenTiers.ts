import { luminance, type MantineTheme } from "@mantine/core";
import { getValueAtPath } from "../getResolvedTokenValue/getResolvedTokenValue";
import { normalizeTokenValue } from "../normalizeTokenValue/normalizeTokenValue";
import {
  getTargetFromTokenReference,
  isTokenReference,
} from "../themeReferences/themeReferences";
import {
  COMPOSITE_TOKEN_FIELDS,
  isCompositeTokenKind,
  isTokenDefinition,
  isTokenScale,
  type CompositeTokenKind,
  type FieldSpec,
} from "../tokenCatalog/defineTokens";
import { VIDEO_TOKEN_CATALOG } from "../tokenCatalog/tokenCatalog";
import { VIDEO_FONT_REGISTRY, type VideoFontId } from "../videoFontRegistry/videoFontRegistry";
import type {
  CatalogNode,
  GlowValue,
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
  /** True while resolving the ground itself, which cannot depend on the ground. */
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

function _isColorPair(value: unknown): value is Readonly<{ onDark: unknown; onLight: unknown }> {
  return _isRecord(value) && "onDark" in value && "onLight" in value;
}

function _primaryColor(context: ResolutionContext): unknown {
  const shade = context.mantine.primaryShade;
  const index =
    typeof shade === "number" ? shade : context.isDarkGround ? shade.dark : shade.light;
  return context.mantine.colors[context.mantine.primaryColor]?.[index];
}

function _lookup(context: ResolutionContext, reference: TokenReference): unknown {
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

function _resolveReference(
  context: ResolutionContext,
  reference: TokenReference,
  field: FieldSpec,
  path: string,
  stack: readonly string[],
): unknown {
  if (stack.includes(reference)) {
    context.issues.push({ path, message: `Reference cycle: ${[...stack, reference].join(" → ")}` });
    return undefined;
  }
  const target = _lookup(context, reference);
  if (target === undefined) {
    context.issues.push({ path, message: `${reference} does not point at a token` });
    return undefined;
  }
  return _resolveValue(context, target, field, path, [...stack, reference]);
}

function _resolveValue(
  context: ResolutionContext,
  raw: unknown,
  field: FieldSpec,
  path: string,
  stack: readonly string[],
): unknown {
  if (isTokenReference(raw)) {
    return _resolveReference(context, raw, field, path, stack);
  }
  if (field.kind === "color" && _isColorPair(raw)) {
    if (context.forbidColorPairs) {
      context.issues.push({ path, message: "The ground colour cannot depend on the ground" });
      return undefined;
    }
    return _resolveValue(context, context.isDarkGround ? raw.onDark : raw.onLight, field, path, stack);
  }
  if (isCompositeTokenKind(field.kind)) {
    return _resolveComposite(context, field.kind, raw, path, stack);
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
    ...(fields.lineHeight === undefined ? {} : { lineHeight: fields.lineHeight }),
    ...(fields.letterSpacing === undefined ? {} : { letterSpacing: fields.letterSpacing }),
    ...(fields.transform === undefined ? {} : { textTransform: fields.transform }),
    ...(fields.numeric === undefined ? {} : { fontVariantNumeric: fields.numeric }),
    color,
    alpha: fields.alpha ?? 1,
    ...(textShadow ? { textShadow: { ...textShadow, color } } : {}),
    ...(glow ? { glow: { ...glow, color } } : {}),
    ...(fields.stroke === undefined ? {} : { strokeWidth: fields.stroke }),
  };
}

function _resolveComposite(
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
  const resolved: Record<string, unknown> = {};
  for (const [name, field] of Object.entries(fields)) {
    if (raw[name] === undefined) {
      if (required.includes(name)) {
        context.issues.push({ path: `${path}.${name}`, message: "Missing" });
      }
      continue;
    }
    resolved[name] = _resolveValue(context, raw[name], field, `${path}.${name}`, stack);
  }
  return kind === "typeStyle" ? _finishTypeStyle(resolved) : resolved;
}

function _resolveNode(
  context: ResolutionContext,
  node: CatalogNode,
  raw: unknown,
  path: string,
): unknown {
  if (isTokenDefinition(node)) {
    if (raw === undefined) {
      context.issues.push({ path, message: "Missing token" });
      return undefined;
    }
    return _resolveValue(context, raw, node, path, []);
  }
  if (isTokenScale(node)) {
    const entries = _isRecord(raw) ? Object.entries(raw) : [];
    return Object.fromEntries(
      entries.map(([key, value]) => [key, _resolveValue(context, value, node.scale, `${path}.${key}`, [])]),
    );
  }
  return Object.fromEntries(
    Object.entries(node).map(([key, child]) => [
      key,
      _resolveNode(context, child, _isRecord(raw) ? raw[key] : undefined, path ? `${path}.${key}` : key),
    ]),
  );
}

function _resolveComponents(context: ResolutionContext): unknown {
  return Object.fromEntries(
    Object.entries(VIDEO_TOKEN_CATALOG.components).map(([name, group]) => [
      name,
      _resolveNode(
        context,
        group,
        getValueAtPath(context.components, [name, "defaultProps"]),
        `components.${name}`,
      ),
    ]),
  );
}

/**
 * Resolves every catalog token of a merged theme: follows `$` references,
 * picks `{ onDark, onLight }` colours by the ground's luminance, fills
 * composite tokens, and converts Mantine CSS strings to numbers. Collects
 * issues instead of throwing so one pass reports every problem.
 */
export function resolveTokenTiers(
  options: Readonly<{ merged: VideoThemePatch; mantine: MantineTheme }>,
): ResolvedTokenTiers {
  const video = getValueAtPath(options.merged, ["other", "video"]);
  const issues: VideoThemeIssue[] = [];
  const groundContext: ResolutionContext = {
    atomic: getValueAtPath(video, ["atomic"]),
    semantic: getValueAtPath(video, ["semantic"]),
    components: options.merged.components,
    mantine: options.mantine,
    isDarkGround: true,
    forbidColorPairs: true,
    issues,
  };
  const ground = _resolveValue(
    groundContext,
    getValueAtPath(groundContext.semantic, ["color", "ground"]),
    { kind: "color" },
    "color.ground",
    [],
  );
  const isDarkGround =
    typeof ground === "string" ? luminance(ground) < options.mantine.luminanceThreshold : true;
  const context: ResolutionContext = { ...groundContext, isDarkGround, forbidColorPairs: false };
  return {
    atomic: _resolveNode(context, VIDEO_TOKEN_CATALOG.atomic, context.atomic, "atomic"),
    semantic: _resolveNode(context, VIDEO_TOKEN_CATALOG.semantic, context.semantic, ""),
    components: _resolveComponents(context),
    isDarkGround,
    issues,
  };
}

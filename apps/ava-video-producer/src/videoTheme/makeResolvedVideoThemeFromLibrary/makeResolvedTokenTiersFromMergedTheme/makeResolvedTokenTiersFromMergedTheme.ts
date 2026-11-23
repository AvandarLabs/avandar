import { makeObjectFromEntries } from "@avandar/utils";
import { luminance, type MantineTheme } from "@mantine/core";
import { getValueAtPath } from "../../getValueAtPath";
import { normalizeTokenValue } from "../../normalizeTokenValue/normalizeTokenValue";
import { ThemeReferences } from "../../ThemeReferences/ThemeReferences";
import { VIDEO_TOKEN_CATALOG } from "../../tokenCatalog/TokenCatalog/TokenCatalog";
import {
  COMPOSITE_TOKEN_FIELDS,
  type CompositeTokenKind,
  type FieldSpec,
  TokenDefinitions,
} from "../../tokenCatalog/TokenDefinitions";
import { createGroundContext } from "./createGroundContext";
import { finishTypeStyleFromFields } from "./finishTypeStyleFromFields";
import { getValueFromTokenReference } from "./getValueFromTokenReference";
import { ResolvedShadowScaling } from "./ResolvedShadowScaling";
import { ResolvedTokenGuards } from "./ResolvedTokenGuards";
import {
  type ResolutionContext,
  type PickPairByContrastColorOptions,
  type BuildTokenFromDefinitionOptions,
  type ResolvedTokenTiers,
} from "./ResolvedTokenTiers.types";
import type {
  CatalogNode,
  TokenReference,
  VideoThemeIssue,
  VideoThemePatch,
} from "../../videoTheme.types";

type BuildValueFromReferenceParameters = {
  context: ResolutionContext;
  reference: TokenReference;
  field: FieldSpec;
  path: string;
  stack: readonly string[];
};
type BuildValueFromRawParameters = {
  context: ResolutionContext;
  raw: unknown;
  field: FieldSpec;
  path: string;
  stack: readonly string[];
};
type BuildCompositeFromFieldsParameters = {
  context: ResolutionContext;
  kind: CompositeTokenKind;
  raw: unknown;
  path: string;
  stack: readonly string[];
};
type BuildNodeFromCatalogParameters = {
  context: ResolutionContext;
  node: CatalogNode;
  raw: unknown;
  path: string;
};
function _buildValueFromReference({
  context,
  reference,
  field,
  path,
  stack,
}: Readonly<BuildValueFromReferenceParameters>): unknown {
  if (stack.includes(reference)) {
    context.issues.push({
      path,
      message: `Reference cycle: ${[...stack, reference].join(" → ")}`,
    });
    return undefined;
  }
  const target = getValueFromTokenReference({
    context,
    reference,
  });
  if (target === undefined) {
    context.issues.push({
      path,
      message: `${reference} does not point at a token`,
    });
    return undefined;
  }
  return _buildValueFromRaw({
    context,
    raw: target,
    field,
    path,
    stack: [...stack, reference],
  });
}
function _buildValueFromRaw({
  context,
  raw,
  field,
  path,
  stack,
}: Readonly<BuildValueFromRawParameters>): unknown {
  if (ThemeReferences.isTokenReference(raw)) {
    return _buildValueFromReference({
      context,
      reference: raw,
      field,
      path,
      stack,
    });
  }
  if (field.kind === "color" && ResolvedTokenGuards.isColorPair(raw)) {
    if (context.forbidColorPairs) {
      context.issues.push({
        path,
        message: "The ground colour cannot depend on the ground",
      });
      return undefined;
    }
    return _buildValueFromRaw({
      context,
      raw: context.isDarkGround ? raw.onDark : raw.onLight,
      field,
      path,
      stack,
    });
  }
  if (TokenDefinitions.isCompositeTokenKind(field.kind)) {
    return _buildCompositeFromFields({
      context,
      kind: field.kind,
      raw,
      path,
      stack,
    });
  }
  return _getNormalizedRawValue({ context, raw, field, path });
}
function _getNormalizedRawValue(
  options: Readonly<Omit<BuildValueFromRawParameters, "stack">>,
): unknown {
  const normalized = normalizeTokenValue({
    field: options.field,
    value: options.raw,
  });
  if (!normalized.ok) {
    options.context.issues.push({
      path: options.path,
      message: normalized.message,
    });
    return undefined;
  }
  return normalized.value;
}
function _buildCompositeFromFields({
  context,
  kind,
  raw,
  path,
  stack,
}: Readonly<BuildCompositeFromFieldsParameters>): unknown {
  if (!ResolvedTokenGuards.isRecord(raw)) {
    context.issues.push({ path, message: `Expected a ${kind}` });
    return undefined;
  }
  const spec = COMPOSITE_TOKEN_FIELDS[kind];
  const required = new Set<string>(spec.required);
  const fields: Readonly<Record<string, FieldSpec>> = spec.fields;
  const resolved = makeObjectFromEntries(
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
          _buildValueFromRaw({
            context,
            raw: raw[name],
            field,
            path: `${path}.${name}`,
            stack,
          }),
        ],
      ];
    }),
  );
  return kind === "typeStyle"
    ? finishTypeStyleFromFields(resolved)
    : kind === "elevation"
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
  const contrastColor = _buildValueFromRaw({
    context,
    raw: getValueAtPath({
      source: context.semantic,
      path: contrastPath.split("."),
    }),
    field: { kind: "color" },
    path: contrastPath,
    stack: [path],
  });
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
      : _buildValueFromRaw({
          context,
          raw: picked,
          field: definition,
          path,
          stack: [],
        });
  }
  return _buildValueFromRaw({
    context,
    raw,
    field: definition,
    path,
    stack: [],
  });
}
function _buildNodeFromCatalog({
  context,
  node,
  raw,
  path,
}: Readonly<BuildNodeFromCatalogParameters>): unknown {
  if (TokenDefinitions.isTokenDefinition(node)) {
    return _buildTokenFromDefinition({ context, definition: node, raw, path });
  }
  if (TokenDefinitions.isTokenScale(node)) {
    const entries = ResolvedTokenGuards.isRecord(raw)
      ? Object.entries(raw)
      : [];
    return makeObjectFromEntries(
      entries.map(([key, value]) => {
        return [
          key,
          _buildValueFromRaw({
            context,
            raw: value,
            field: node.scale,
            path: `${path}.${key}`,
            stack: [],
          }),
        ];
      }),
    );
  }
  return makeObjectFromEntries(
    Object.entries(node).map(([key, child]) => {
      return [
        key,
        _buildNodeFromCatalog({
          context,
          node: child,
          raw: ResolvedTokenGuards.isRecord(raw) ? raw[key] : undefined,
          path: path ? `${path}.${key}` : key,
        }),
      ];
    }),
  );
}
function _buildComponentsFromCatalog(context: ResolutionContext): unknown {
  return makeObjectFromEntries(
    Object.entries(VIDEO_TOKEN_CATALOG.components).map(([name, group]) => {
      return [
        name,
        _buildNodeFromCatalog({
          context,
          node: group,
          raw: getValueAtPath({
            source: context.components,
            path: [name, "defaultProps"],
          }),
          path: `components.${name}`,
        }),
      ];
    }),
  );
}
function _isGroundDark(groundContext: ResolutionContext): boolean {
  const ground = _buildValueFromRaw({
    context: groundContext,
    raw: getValueAtPath({
      source: groundContext.semantic,
      path: ["color", "ground"],
    }),
    field: { kind: "color" },
    path: "color.ground",
    stack: [],
  });
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
  const groundContext = createGroundContext({ options, issues });
  const isDarkGround = _isGroundDark(groundContext);
  const context: ResolutionContext = {
    ...groundContext,
    isDarkGround,
    forbidColorPairs: false,
  };
  const semantic = _buildNodeFromCatalog({
    context,
    node: VIDEO_TOKEN_CATALOG.semantic,
    raw: context.semantic,
    path: "",
  });
  const components = _buildComponentsFromCatalog(context);
  const strength = ResolvedShadowScaling.getShadowStrength(semantic);
  return {
    atomic: _buildNodeFromCatalog({
      context,
      node: VIDEO_TOKEN_CATALOG.atomic,
      raw: context.atomic,
      path: "atomic",
    }),
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

import {
  DEFAULT_THEME,
  mergeMantineTheme,
  type MantineTheme,
} from "@mantine/core";
import { isCameraSafeEasing } from "../cameraEasing/cameraEasing";
import { elevationToBoxShadow } from "../cssValues/cssValues";
import { getResolvedTokenValue } from "../getResolvedTokenValue/getResolvedTokenValue";
import { buildVideoThemeHashFromContent } from "../hashVideoTheme/hashVideoTheme";
import { mergeVideoThemeLayers } from "../mergeVideoThemeLayers/mergeVideoThemeLayers";
import { listTokenDefinitions } from "../tokenCatalog/tokenCatalog";
import { VIDEO_FONT_REGISTRY } from "../videoFontRegistry/videoFontRegistry";
import { VideoThemeError } from "../VideoThemeError/VideoThemeError";
import { makeResolvedTokenTiersFromMergedTheme } from "./makeResolvedTokenTiersFromMergedTheme";
import type {
  ResolvedTypeStyle,
  ResolvedVideoAtomic,
  ResolvedVideoComponents,
  ResolvedVideoSemantic,
  ResolvedVideoTheme,
  VideoThemeIssue,
  VideoThemeLibrary,
  VideoThemePatch,
  VideoThemeScope,
} from "../videoTheme.types";

const MANTINE_SHADOW_KEYS = ["xs", "sm", "md", "lg", "xl"] as const;

function _createMantineTheme(merged: VideoThemePatch) {
  const mantineKeys = Object.fromEntries(
    Object.entries(merged).filter(
      ([key]) => key !== "other" && key !== "components",
    ),
  );
  try {
    return mergeMantineTheme(DEFAULT_THEME, mantineKeys);
  } catch (error) {
    throw new VideoThemeError([
      {
        path: "primaryColor",
        message: error instanceof Error ? error.message : String(error),
      },
    ]);
  }
}

function _findUnmeasuredGraphicText(
  tiers: Readonly<{
    atomic: ResolvedVideoAtomic;
    semantic: ResolvedVideoSemantic;
    components: ResolvedVideoComponents;
  }>,
): VideoThemeIssue[] {
  return listTokenDefinitions()
    .filter(
      ({ definition }) =>
        definition.kind === "typeStyle" && definition.surface === "graphic",
    )
    .flatMap(({ path }) => {
      const style = getResolvedTokenValue(tiers, path) as
        | ResolvedTypeStyle
        | undefined;
      if (!style || VIDEO_FONT_REGISTRY[style.fontId].measured) {
        return [];
      }
      return [
        {
          path,
          message: `Graphic text needs a font with measured glyph widths, such as Arial or Courier New. ${VIDEO_FONT_REGISTRY[style.fontId].label} has none.`,
        },
      ];
    });
}

function _findUnsafeCameraCurves(
  semantic: ResolvedVideoSemantic,
): VideoThemeIssue[] {
  const curves = [
    ...Object.entries(semantic.camera.easing).map(
      ([name, easing]) => [`camera.easing.${name}`, easing] as const,
    ),
    ...Object.entries(semantic.camera.presets).map(
      ([name, preset]) =>
        [`camera.presets.${name}.easing`, preset.easing] as const,
    ),
  ];
  return curves
    .filter(([, easing]) => !isCameraSafeEasing(easing))
    .map(([path]) => ({
      path,
      message:
        "A camera curve must keep its control points between 0 and 1, or be the cubic in-out, so the camera stays between its framings.",
    }));
}

function _deriveMantineShadows(atomic: ResolvedVideoAtomic, color: string) {
  return Object.fromEntries(
    MANTINE_SHADOW_KEYS.flatMap((key) => {
      const shadow = atomic.shadow[key];
      return shadow
        ? [[key, elevationToBoxShadow({ layers: shadow.layers, color })]]
        : [];
    }),
  );
}

type ResolvedContent = Readonly<{
  atomic: ResolvedVideoAtomic;
  semantic: ResolvedVideoSemantic;
  components: ResolvedVideoComponents;
  isDarkGround: boolean;
}>;

function _findRuleIssues(content: ResolvedContent): VideoThemeIssue[] {
  return [
    ..._findUnmeasuredGraphicText(content),
    ..._findUnsafeCameraCurves(content.semantic),
  ];
}

function _buildMantineFromContent(
  mantine: MantineTheme,
  content: ResolvedContent,
): MantineTheme {
  return mergeMantineTheme(mantine, {
    shadows: _deriveMantineShadows(
      content.atomic,
      content.semantic.color.shadowColor,
    ),
    components: Object.fromEntries(
      Object.entries(content.components).map(([name, defaultProps]) => [
        name,
        { defaultProps },
      ]),
    ),
    other: { video: { atomic: content.atomic, semantic: content.semantic } },
  });
}

/**
 * Resolves a theme for one item: merges its layers (see
 * `mergeVideoThemeLayers`), resolves every token, enforces measured fonts
 * for graphic text, and returns concrete values plus a Mantine theme whose
 * `components` carry each themed shape's `defaultProps` and whose
 * `other.video` carries the resolved tiers. Throws a `VideoThemeError`
 * listing every problem. It is pure and DOM-free, so the gallery, the live
 * player, renders, and the save route all resolve the same way.
 */
export function makeResolvedVideoThemeFromLibrary(
  library: VideoThemeLibrary,
  themeId: string,
  scope: VideoThemeScope = {},
): ResolvedVideoTheme {
  const document = library.get(themeId);
  if (!document) {
    throw new VideoThemeError([
      { path: "id", message: `Unknown theme "${themeId}"` },
    ]);
  }
  const merged = mergeVideoThemeLayers(library, themeId, scope);
  const mantine = _createMantineTheme(merged);
  const tiers = makeResolvedTokenTiersFromMergedTheme({ merged, mantine });
  if (tiers.issues.length > 0) {
    throw new VideoThemeError(tiers.issues);
  }
  const content: ResolvedContent = {
    atomic: tiers.atomic as ResolvedVideoAtomic,
    semantic: tiers.semantic as ResolvedVideoSemantic,
    components: tiers.components as ResolvedVideoComponents,
    isDarkGround: tiers.isDarkGround,
  };
  const ruleIssues = _findRuleIssues(content);
  if (ruleIssues.length > 0) {
    throw new VideoThemeError(ruleIssues);
  }
  return {
    id: themeId,
    label: document.label,
    hash: buildVideoThemeHashFromContent(content),
    ...content,
    mantine: _buildMantineFromContent(mantine, content),
  };
}

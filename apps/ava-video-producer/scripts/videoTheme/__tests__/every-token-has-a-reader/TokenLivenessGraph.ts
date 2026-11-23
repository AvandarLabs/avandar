import { getValueAtPath } from "../../../../src/videoTheme/getValueAtPath";
import { BUILT_IN_VIDEO_THEMES } from "../../../../src/videoTheme/makeVideoThemeLibraryFromDocuments/makeVideoThemeLibraryFromDocuments";
import { ThemeReferences } from "../../../../src/videoTheme/ThemeReferences/ThemeReferences";
import { TokenCatalog } from "../../../../src/videoTheme/tokenCatalog/TokenCatalog/TokenCatalog";
import type { VideoThemeDocument } from "../../../../src/videoTheme/videoTheme.types";

const PALETTE_GROUPS = [
  "sketch.profile",
  "camera.presets",
  "motion.easingProfiles",
];

const TOKEN_PATHS = TokenCatalog.listTokenDefinitions()
  .map((entry) => {
    return entry.path;
  })
  .filter((tokenPath) => {
    return !TokenCatalog.isMantineTokenRoot(tokenPath.split(".")[0]);
  });

const TOKEN_PATH_SET: ReadonlySet<string> = new Set(TOKEN_PATHS);

/** The raw value of a token in a theme file, before references resolve. */
function _rawValue({
  document,
  tokenPath,
}: Readonly<{
  document: VideoThemeDocument;
  tokenPath: string;
}>): unknown {
  const [root, ...rest] = tokenPath.split(".");
  if (root === "components") {
    return getValueAtPath({
      source: document,
      path: ["components", rest[0], "defaultProps", ...rest.slice(1)],
    });
  }
  return root === "atomic"
    ? getValueAtPath({
        source: document,
        path: ["other", "video", "atomic", ...rest],
      })
    : getValueAtPath({
        source: document,
        path: ["other", "video", "semantic", root, ...rest],
      });
}

function _referencedTokenPaths(value: unknown): string[] {
  if (ThemeReferences.isTokenReference(value)) {
    const target = ThemeReferences.getTargetFromTokenReference(value);
    if (target.tier === "primary" || target.tier === "mantine") {
      return [];
    }
    const segments =
      target.tier === "atomic" ? ["atomic", ...target.path] : [...target.path];
    const prefixes = segments.map((_, index) => {
      return segments.slice(0, segments.length - index).join(".");
    });
    return prefixes
      .filter((prefix) => {
        return TOKEN_PATH_SET.has(prefix);
      })
      .slice(0, 1);
  }
  return typeof value === "object" && value !== null
    ? Object.values(value).flatMap(_referencedTokenPaths)
    : [];
}

/**
 * A token plus, when it belongs to a menu group, every other choice in that
 * menu.
 */
function _withPaletteSiblings(tokenPath: string): string[] {
  const group = PALETTE_GROUPS.find((prefix) => {
    return tokenPath.startsWith(`${prefix}.`);
  });
  return group
    ? TOKEN_PATHS.filter((candidate) => {
        return candidate.startsWith(`${group}.`);
      })
    : [tokenPath];
}

/**
 * Every token read directly, plus every token a live token references in a
 * built-in theme.
 */
function _liveTokenPaths(directReads: readonly string[]): Set<string> {
  const documents = [...BUILT_IN_VIDEO_THEMES.values()];
  const live = new Set<string>();
  const pending: string[] = [];
  const markLive = (tokenPath: string) => {
    Array.from(_withPaletteSiblings(tokenPath)).forEach((member) => {
      if (!live.has(member)) {
        live.add(member);
        pending.push(member);
      }
    });
  };
  directReads
    .filter((tokenPath) => {
      return TOKEN_PATH_SET.has(tokenPath);
    })
    .forEach(markLive);
  for (
    let tokenPath = pending.pop();
    tokenPath !== undefined;
    tokenPath = pending.pop()
  ) {
    const current = tokenPath;
    documents
      .flatMap((document) => {
        return _referencedTokenPaths(
          _rawValue({
            document: document,
            tokenPath: current,
          }),
        );
      })
      .forEach(markLive);
  }
  return live;
}

/**
 * Follows references and menu alternatives from directly observed token reads.
 */
export const TokenLivenessGraph = {
  /** Video-token catalog paths checked for direct or transitive readers. */
  TOKEN_PATHS,
  /** Every token read directly, plus every token a live token references in a
        built-in theme. */
  liveTokenPaths: _liveTokenPaths,
} as const;

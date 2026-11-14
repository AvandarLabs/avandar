import { isCameraSafeEasing } from "../../videoTheme/cameraEasing/cameraEasing";
import { getTokenDefinitionFromPath } from "../../videoTheme/tokenCatalog/tokenCatalog";
import { isCustomScaleKey } from "../customScaleKey/customScaleKey";
import type {
  EasingValue,
  ResolvedVideoTheme,
  TokenDefinition,
  TokenKind,
  TokenReference,
} from "../../videoTheme/videoTheme.types";
import type { TokenRow } from "../tokenRows/tokenRows";

/** One token a reference can point at, with what it currently holds. */
export type ReferenceOption = Readonly<{
  reference: TokenReference;
  /** The target's token path, or `primary` for Mantine's primary colour. */
  path: string;
  kind: TokenKind;
  definition?: TokenDefinition;
  /** Scale key or palette shade index. */
  key?: string;
  value: unknown;
}>;

/**
 * What an option is, for naming it: Mantine's primary colour, a value the
 * producer typed in (a generated custom scale entry), or a named entry.
 */
export function getReferenceOptionRole(
  option: ReferenceOption,
): "primary" | "custom" | "named" {
  if (option.path === "primary") {
    return "primary";
  }
  return isCustomScaleKey(option.key) ? "custom" : "named";
}

function _effectiveKind(path: string, kind: TokenKind): TokenKind {
  if (kind === "cssLength") {
    return "length";
  }
  if (kind === "cssNumber") {
    return path.endsWith("fontWeight") ? "fontWeight" : "number";
  }
  return kind;
}

function _accepts(target: TokenKind, candidate: TokenKind): boolean {
  return target === "fill"
    ? candidate === "color" || candidate === "gradient"
    : candidate === target;
}

function _primaryOption(theme: ResolvedVideoTheme): ReferenceOption {
  const shade = theme.mantine.primaryShade;
  const index =
    typeof shade === "number"
      ? shade
      : theme.isDarkGround
        ? shade.dark
        : shade.light;
  return {
    reference: "$primary",
    path: "primary",
    kind: "color",
    value: theme.mantine.colors[theme.mantine.primaryColor]?.[index],
  };
}

function _paletteOptions(theme: ResolvedVideoTheme): ReferenceOption[] {
  return Object.entries(theme.mantine.colors).flatMap(([name, shades]) => {
    const definition = getTokenDefinitionFromPath(`colors.${name}`);
    return definition
      ? shades.map((value, index) => ({
          reference: `$colors.${name}.${index}` as TokenReference,
          path: `colors.${name}.${index}`,
          kind: "color" as const,
          definition,
          key: String(index),
          value,
        }))
      : [];
  });
}

/**
 * Whether a token, or one field of a composite token, holds a curve that
 * drives the camera: the named camera curves and each camera preset's curve.
 * The resolver reports any of them that `isCameraSafeEasing` refuses, so the
 * editor offers only camera-safe curves there.
 */
export function isCameraCurveToken(
  tokenPath: string,
  fieldPath: readonly string[] = [],
): boolean {
  const path = [tokenPath, ...fieldPath].join(".");
  return (
    path.startsWith("camera.easing.") ||
    /^camera\.presets\.[^.]+\.easing$/.test(path)
  );
}

/**
 * Tokens a reference of one kind may point at: atomic and Mantine values,
 * semantic tokens of the same kind, and for colours Mantine's primary colour
 * and every palette shade. Component tokens are never targets. For a camera
 * curve (`isCameraCurve`), only curves `isCameraSafeEasing` accepts.
 */
export function listReferenceOptions(
  options: Readonly<{
    kind: TokenKind;
    excludePath?: string;
    rows: readonly TokenRow[];
    theme: ResolvedVideoTheme;
    isCameraCurve?: boolean;
  }>,
): readonly ReferenceOption[] {
  const { kind, excludePath, rows, theme, isCameraCurve = false } = options;
  const isColor = kind === "color" || kind === "fill";
  const fromRows: ReferenceOption[] = rows
    .filter(
      (row) =>
        row.tier !== "component" &&
        row.path !== excludePath &&
        _accepts(kind, _effectiveKind(row.path, row.definition.kind)) &&
        (!isCameraCurve || isCameraSafeEasing(row.resolved as EasingValue)),
    )
    .map((row) => ({
      reference: `$${row.path}` as TokenReference,
      path: row.path,
      kind: row.definition.kind,
      definition: row.definition,
      ...(row.scaleKey === undefined ? {} : { key: row.scaleKey }),
      value: row.resolved,
    }));
  return [
    ...(isColor ? [_primaryOption(theme)] : []),
    ...fromRows,
    ...(isColor ? _paletteOptions(theme) : []),
  ];
}

function _scaleOf(path: string): string {
  return path.split(".").slice(0, -1).join(".");
}

/** Options with those from the current reference's scale first, the likeliest picks. */
export function orderReferenceOptions(
  options: readonly ReferenceOption[],
  current: unknown,
): readonly ReferenceOption[] {
  if (typeof current !== "string" || !current.startsWith("$")) {
    return options;
  }
  const scale = _scaleOf(current.slice(1));
  return [
    ...options.filter((option) => _scaleOf(option.path) === scale),
    ...options.filter((option) => _scaleOf(option.path) !== scale),
  ];
}

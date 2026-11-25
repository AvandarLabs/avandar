import { propEq } from "@avandar/utils";
import { match, P } from "ts-pattern";
import { isCameraSafeEasing } from "../../videoTheme/isCameraSafeEasing/isCameraSafeEasing";
import { TokenCatalog } from "../../videoTheme/tokenCatalog/TokenCatalog/TokenCatalog";
import { CustomScaleKeys } from "../CustomScaleKeys/CustomScaleKeys";
import { type TokenRow } from "../TokenRows/TokenRows.types";
import type {
  EasingValue,
  ResolvedVideoTheme,
  TokenDefinition,
  TokenKind,
  TokenReference,
} from "../../videoTheme/videoTheme.types";

const UNCHANGED_REFERENCE_KINDS = [
  "color",
  "colorTuple",
  "paletteName",
  "shade",
  "gradient",
  "fontStack",
  "length",
  "number",
  "opacity",
  "duration",
  "letterSpacing",
  "fontWeight",
  "easing",
  "spring",
  "shadow",
  "glow",
  "textShadow",
  "dash",
  "fontFamily",
  "enum",
  "boolean",
  "fill",
  "typeStyle",
  "paint",
  "elevation",
  "sketchProfile",
  "box",
  "motionStep",
  "cameraPreset",
  "range",
] as const;

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
function _getReferenceOptionRole(
  option: ReferenceOption,
): "primary" | "custom" | "named" {
  return option.path === "primary"
    ? "primary"
    : CustomScaleKeys.isCustomScaleKey(option.key)
      ? "custom"
      : "named";
}
/**
 * The reference a value holds when no option offers it, such as a swatch that
 * was deleted. Undefined for a literal, an unset value, or a listed reference.
 */
function _getUnresolvedReference(
  options: Readonly<{
    value: unknown;
    referenceOptions: readonly ReferenceOption[];
  }>,
): TokenReference | undefined {
  const { value, referenceOptions } = options;
  return typeof value === "string" &&
    value.startsWith("$") &&
    !referenceOptions.some(
      propEq<Readonly<{ reference: string }>, "reference", string>(
        "reference",
        value,
      ),
    )
    ? (value as TokenReference)
    : undefined;
}
function _effectiveKind(
  options: Readonly<{
    path: string;
    kind: TokenKind;
  }>,
): TokenKind {
  const { path, kind } = options;
  return match(kind)
    .with("cssLength", (): TokenKind => {
      return "length";
    })
    .with("cssNumber", () => {
      return path.endsWith("fontWeight")
        ? ("fontWeight" as const)
        : ("number" as const);
    })
    .with(P.union(...UNCHANGED_REFERENCE_KINDS), (matchedKind) => {
      return matchedKind;
    })
    .exhaustive();
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
    const definition = TokenCatalog.getTokenDefinitionFromPath(
      `colors.${name}`,
    );
    return definition
      ? shades.map((value, index) => {
          return {
            reference: `$colors.${name}.${index}`,
            path: `colors.${name}.${index}`,
            kind: "color" as const,
            definition,
            key: String(index),
            value,
          };
        })
      : [];
  });
}
/**
 * Whether a token, or one field of a composite token, holds a curve that
 * drives the camera: the named camera curves and each camera preset's curve.
 * The resolver reports any of them that `isCameraSafeEasing` refuses, so the
 * editor offers only camera-safe curves there.
 */
function _isCameraCurveToken({
  tokenPath,
  fieldPath = [],
}: Readonly<{
  tokenPath: string;
  fieldPath?: readonly string[];
}>): boolean {
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
function _listReferenceOptions(
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
    .filter((row) => {
      const candidate = _effectiveKind({
        path: row.path,
        kind: row.definition.kind,
      });
      const isAccepted =
        kind === "fill"
          ? candidate === "color" || candidate === "gradient"
          : candidate === kind;
      return (
        row.tier !== "component" &&
        row.path !== excludePath &&
        isAccepted &&
        (!isCameraCurve || isCameraSafeEasing(row.resolved as EasingValue))
      );
    })
    .map((row) => {
      return {
        reference: `$${row.path}`,
        path: row.path,
        kind: row.definition.kind,
        definition: row.definition,
        ...(row.scaleKey === undefined ? {} : { key: row.scaleKey }),
        value: row.resolved,
      };
    });
  return [
    ...(isColor ? [_primaryOption(theme)] : []),
    ...fromRows,
    ...(isColor ? _paletteOptions(theme) : []),
  ];
}
function _scaleOf(path: string): string {
  return path.split(".").slice(0, -1).join(".");
}
/**
 * Options with those from the current reference's scale first, the likeliest
 * picks.
 */
function _orderReferenceOptions(
  options: Readonly<{
    referenceOptions: readonly ReferenceOption[];
    current: unknown;
  }>,
): readonly ReferenceOption[] {
  const { referenceOptions, current } = options;
  if (typeof current !== "string" || !current.startsWith("$")) {
    return referenceOptions;
  }
  const scale = _scaleOf(current.slice(1));
  return [
    ...referenceOptions.filter((option) => {
      return _scaleOf(option.path) === scale;
    }),
    ...referenceOptions.filter((option) => {
      return _scaleOf(option.path) !== scale;
    }),
  ];
}

/** Lists compatible token references for the video theme editor pickers. */
export const ReferenceOptions = {
  /**
   * What an option is, for naming it: Mantine's primary colour, a value the
   * producer typed in (a generated custom scale entry), or a named entry.
   */
  getReferenceOptionRole: _getReferenceOptionRole,
  /**
   * The reference a value holds when no option offers it, such as a swatch that
   * was deleted.
   */
  getUnresolvedReference: _getUnresolvedReference,
  /**
   * Whether a token, or one field of a composite token, holds a curve that
   * drives the camera: the named camera curves and each camera preset's curve.
   */
  isCameraCurveToken: _isCameraCurveToken,
  /**
   * Tokens a reference of one kind may point at: atomic and Mantine values,
   * semantic tokens of the same kind, and for colours Mantine's primary colour
   * and every palette shade.
   */
  listReferenceOptions: _listReferenceOptions,
  /**
   * Options with those from the current reference's scale first, the likeliest
   * picks.
   */
  orderReferenceOptions: _orderReferenceOptions,
};

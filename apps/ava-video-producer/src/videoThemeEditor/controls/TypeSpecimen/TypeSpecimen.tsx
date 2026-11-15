import {
  buildColorWithAlpha,
  fillToCss,
  textShadowToCss,
} from "../../../videoTheme/cssValueHelpers/cssValueHelpers";
import { useTokenEditor } from "../../TokenEditorContext";
import { ContrastBadge } from "../ContrastBadge/ContrastBadge";
import css from "./TypeSpecimen.module.css";
import type { ResolvedTypeStyle } from "../../../videoTheme/videoTheme.types";

const SPECIMEN_MAX_SIZE = 40;

/** A sample line set in a resolved type style on the theme's ground, with its contrast. */
export function TypeSpecimen({
  style,
}: Readonly<{ style: ResolvedTypeStyle | undefined }>) {
  const { theme } = useTokenEditor();
  if (!style) {
    return null;
  }
  return (
    <div className={css.typeSpecimenRow}>
      <p
        className={css.typeSpecimen}
        data-inherit-dim
        style={{
          background: fillToCss(theme.semantic.color.groundFill),
          color: buildColorWithAlpha(style.color, style.alpha),
          fontFamily: style.fontFamily,
          fontSize: Math.min(style.fontSize, SPECIMEN_MAX_SIZE),
          fontWeight: style.fontWeight,
          letterSpacing:
            style.letterSpacing === undefined
              ? undefined
              : `${style.letterSpacing}em`,
          lineHeight: style.lineHeight,
          textTransform: style.textTransform,
          fontVariantNumeric: style.fontVariantNumeric,
          textShadow: style.textShadow
            ? textShadowToCss(style.textShadow)
            : undefined,
        }}
      >
        {"Data moves through the pipeline"}
      </p>
      <ContrastBadge color={style.color} style={style} />
    </div>
  );
}

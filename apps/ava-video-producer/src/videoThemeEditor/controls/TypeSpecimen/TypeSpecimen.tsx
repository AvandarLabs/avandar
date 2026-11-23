import { VideoCssValues } from "../../../videoTheme/VideoCssValues/VideoCssValues";
import { useTokenEditor } from "../../TokenEditorContext";
import { ContrastBadge } from "../ContrastBadge/ContrastBadge";
import css from "./TypeSpecimen.module.css";
import type { ResolvedTypeStyle } from "../../../videoTheme/videoTheme.types";
import type { ReactNode } from "react";

type Props = {
  style: ResolvedTypeStyle | undefined;
};
const SPECIMEN_MAX_SIZE = 40;
/**
 * A sample line set in a resolved type style on the theme's ground, with its
 * contrast.
 */
export function TypeSpecimen({ style }: Readonly<Props>): ReactNode {
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
          background: VideoCssValues.makeCssFromFill(
            theme.semantic.color.groundFill,
          ),
          color: VideoCssValues.makeColorFromAlpha({
            color: style.color,
            alpha: style.alpha,
          }),
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
            ? VideoCssValues.makeCssFromTextShadow(style.textShadow)
            : undefined,
        }}
      >
        {"Data moves through the pipeline"}
      </p>
      <ContrastBadge color={style.color} style={style} />
    </div>
  );
}

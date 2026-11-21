import { StageTheme } from "../../../StageTheme/StageTheme";
import css from "./MediaCalloutLabel.module.css";
import type { useVideoShapeScales } from "../../../../videoTheme/useVideoShapeScales";
import type {
  useVideoTheme,
  useVideoTokens,
} from "../../../../videoTheme/videoThemeHelpers";
import type { TextLayout } from "../../../layout/TextLayout";
import type { ReactNode } from "react";

type Props = {
  tokens: ReturnType<typeof useVideoTokens>;
  scales: ReturnType<typeof useVideoShapeScales>;
  spacing: ReturnType<typeof useVideoTheme>["mantine"]["spacing"];
  scene: ReturnType<typeof useVideoTokens>["color"]["scene"];
  caption: ReturnType<typeof useVideoTokens>["text"]["stage"]["caption"];
  labelWidth: number;
  label: ReturnType<typeof TextLayout.fitTextLines>;
  labelX: number;
  labelY: number;
};
/** Renders media callout label. */
export function MediaCalloutLabel({
  tokens,
  scales,
  spacing,
  scene,
  caption,
  labelWidth,
  label,
  labelX,
  labelY,
}: Readonly<Props>): ReactNode {
  return (
    <div
      className={css.mediaCalloutLabeldiv1}
      style={{
        left: labelX,
        top: labelY,
        width: labelWidth,
        padding: `${spacing["10"]} ${spacing["2xs"]}`,
        fontSize: label.fontSize,
        ...StageTheme.getStageTextStyle({
          role: caption,
          fields: ["lineHeight", "fontWeight"],
        }),
        color: scene.foreground,
        background: scene.ground,
        border: `${scales.stroke(tokens.stroke.hairline)}px solid ${scene.brandStrong}`,
        borderRadius: scales.corner(tokens.corner.cell),
      }}
    >
      {label.lines.map((line, i) => {
        // prettier-ignore
        // These stateless text nodes are fixed
        // wrapped-line slots within one keyed
        // scene or callout. Duplicate lines are
        // valid.
        // react-doctor-disable-next-line no-array-index-as-key
        return <div key={i}>{line}</div>;
      })}
    </div>
  );
}

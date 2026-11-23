import type {
  useVideoTheme,
  useVideoTokens,
} from "../../../../videoTheme/videoThemeHelpers";
import type { TextLayout } from "../../../layout/TextLayout";
import type { ReactNode } from "react";

type Props = {
  spacing: ReturnType<typeof useVideoTheme>["mantine"]["spacing"];
  scene: ReturnType<typeof useVideoTokens>["color"]["scene"];
  cardTitle: ReturnType<typeof useVideoTokens>["text"]["stage"]["cardTitle"];
  detail: ReturnType<typeof TextLayout.fitTextLines> | undefined;
};
/** Renders graph node detail. */
export function GraphNodeDetail({
  spacing,
  scene,
  cardTitle,
  detail,
}: Readonly<Props>): ReactNode {
  if (!detail) {
    return undefined;
  }
  return (
    <div
      style={{
        marginTop: spacing["10"],
        fontSize: detail.fontSize,
        color: scene.mutedForeground,
        lineHeight: cardTitle.lineHeight,
      }}
    >
      {detail.lines.map((line, i) => {
        // prettier-ignore
        // These stateless text nodes are fixed
        // wrapped-line slots within one keyed
        // node. Duplicate lines are valid.
        // react-doctor-disable-next-line no-array-index-as-key
        return <div key={i}>{line}</div>;
      })}
    </div>
  );
}

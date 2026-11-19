import { Text } from "../../graphics-common/Text";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicProps,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

type Props = Readonly<{ footer: string; accent: string }>;

/** The divider, accent dot, and footer note at the bottom of the window. */
export function CodeFooter({ footer, accent }: Props): ReactNode {
  const style = useGraphicProps("CodeFocus", {});
  const { color, sketch } = useGraphicTokens();
  const shapes = useGraphicShapeScales();
  return (
    <>
      <SketchedShape
        shape={{ kind: "path", d: "M84 478 H876" }}
        profile={sketch.shape}
        stroke={color.line}
        strokeWidth={shapes.stroke(style.dividerWidth)}
      />
      <circle cx={107} cy={500} r={style.footerDotRadius} fill={accent} />
      <Text role="pill" x={122} y={505}>
        {footer}
      </Text>
    </>
  );
}

import { Panel } from "../graphics-common/Panel";
import { Text } from "../graphics-common/Text";
import {
  useGraphicProps,
  useGraphicTokens,
} from "../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

const DOT_COUNT = 3;
const DOT_SPACING = 20;

/** Shared terminal/editor frame. Exclusive to this directory's preset components. */
export function CodeWindow({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const style = useGraphicProps("CodeWindow", {});
  const { color } = useGraphicTokens();
  return (
    <Panel x={70} y={111} width={820} height={411} radius={style.radius}>
      <path
        d="M70 164 H890"
        stroke={color.line}
        strokeWidth={style.dividerWidth}
      />
      {Array.from({ length: DOT_COUNT }, (_, i) => {
        return (
          <circle
            key={i}
            cx={95 + i * DOT_SPACING}
            cy={138}
            r={style.dotRadius}
            fill={color.inactive}
            fillOpacity={style.dotAlpha}
          />
        );
      })}
      <Text role="footnote" x={480} y={144} anchor="middle">
        {title}
      </Text>
      {children}
    </Panel>
  );
}

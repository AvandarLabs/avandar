import { Panel, STOCK, Text } from "../graphics-common";
import type { ReactNode } from "react";

/** Shared terminal/editor frame. Exclusive to this directory's preset components. */
export function CodeWindow({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Panel x={70} y={111} width={820} height={411} radius={19}>
      <path d="M70 164 H890" stroke={STOCK.line} />
      {[0, 1, 2].map((i) => (
        <circle
          key={i}
          cx={95 + i * 20}
          cy={138}
          r={4.5}
          fill={STOCK.muted}
          fillOpacity={0.45}
        />
      ))}
      <Text x={480} y={144} size={14} mono fill={STOCK.muted} anchor="middle">
        {title}
      </Text>
      {children}
    </Panel>
  );
}

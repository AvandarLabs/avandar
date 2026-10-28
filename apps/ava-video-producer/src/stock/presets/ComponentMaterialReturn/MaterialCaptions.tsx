import { ROUTE_COLORS } from "./routeColors";
import { SceneLabel } from "./SceneLabel";
import type { Input } from "./ComponentMaterialReturn.schema";
import type { ReactNode } from "react";
type Props = { input: Input };
/**
 * Stable captions and route swatches remain above the complete handling path.
 */
export function MaterialCaptions({ input }: Readonly<Props>): ReactNode {
  const captions = [
    { text: input.copy.returned, x: 50, y: 70, width: 270 },
    { text: input.copy.output, x: 420, y: 70, width: 280 },
  ];
  const routes = [
    { route: "reuse", x: 45, y: 120, width: 300 },
    { route: "repair", x: 380, y: 120, width: 300 },
    { route: "recycle", x: 730, y: 70, width: 210 },
    { route: "residue", x: 730, y: 160, width: 210 },
    { route: "replacement", x: 50, y: 170, width: 300 },
  ] as const;
  return (
    <g>
      {captions.map((label) => (
        <SceneLabel key={label.x} {...label} />
      ))}
      {routes.map(({ route, x, y, width }) => (
        <g key={route}>
          <rect
            data-route-key={route}
            x={x - 18}
            y={y - 10}
            width={10}
            height={10}
            fill={ROUTE_COLORS[route]}
          />
          <SceneLabel text={input.copy[route]} x={x} y={y} width={width} />
        </g>
      ))}
    </g>
  );
}

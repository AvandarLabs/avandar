import { propEq } from "@avandar/utils";
import { useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import { INSTALLATION_CATEGORIES } from "./installationColors";
import { SceneLabel } from "./SceneLabel";
import type { Input } from "./StreetShadeInstallation.schema";
import type { ReactNode } from "react";

type Props = { input: Input };
/** Every installation names its owning zone, including zero-area objects. */
export function ShadeLegend({ input }: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  return (
    <g>
      {input.installations.map((item, index) => {
        return (
          <g key={item.id} data-label-owner={item.id}>
            <rect
              data-installation-key={index}
              x={45 + index * 225}
              y={420}
              width={14}
              height={14}
              fill={tokens.color.categorical[INSTALLATION_CATEGORIES[index]]}
            />
            <SceneLabel
              text={item.label}
              x={45 + index * 225}
              y={450}
              width={195}
              lines={3}
            />
            <SceneLabel
              text={input.zones.find(propEq("id", item.zoneId))!.label}
              x={45 + index * 225}
              y={496}
              width={195}
              lines={3}
            />
          </g>
        );
      })}
    </g>
  );
}

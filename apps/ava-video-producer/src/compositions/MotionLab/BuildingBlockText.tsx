import { useVideoTheme } from "../../videoTheme/videoThemeHelpers";
import type { CSSProperties, ReactNode } from "react";

type Props = {
  number: string;
  title: string;
  detail: string;
};

/** One building block's number beside its title and detail. */
export function BuildingBlockText({
  number,
  title,
  detail,
}: Readonly<Props>): ReactNode {
  const { semantic, mantine, atomic } = useVideoTheme();
  const scene = semantic.color.scene;
  return (
    <>
      <span
        style={{ fontSize: mantine.fontSizes["6xl"], color: scene.brandStrong }}
      >
        {number}
      </span>
      <div>
        <div
          style={{
            fontSize: mantine.fontSizes["7xl"],
            fontWeight: atomic.fontWeight.semibold,
            marginBottom: mantine.spacing["10"],
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: mantine.fontSizes.xl,
            color: scene.mutedForeground,
          }}
        >
          {detail}
        </div>
      </div>
    </>
  );
}

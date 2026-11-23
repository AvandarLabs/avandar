import { useVideoTheme } from "../../videoTheme/videoThemeHelpers";
import type { CSSProperties, ReactNode } from "react";

type Props = {
  style?: CSSProperties;
  className?: string;
  children: ReactNode;
};

/** The tracked capitals that head each part of the study. */
export function SectionLabel({
  style,
  className,
  children,
}: Readonly<Props>): ReactNode {
  const { semantic, mantine, atomic } = useVideoTheme();
  return (
    <div
      className={className}
      style={{
        ...style,
        fontSize: mantine.fontSizes.md,
        letterSpacing: `${atomic.letterSpacing.capitals}em`,
        color: semantic.color.scene.mutedForeground,
      }}
    >
      {children}
    </div>
  );
}

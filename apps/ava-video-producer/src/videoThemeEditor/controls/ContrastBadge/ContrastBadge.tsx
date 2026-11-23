import { Badge } from "@mantine/core";
import { clsx } from "clsx";
import { useTokenEditor } from "../../TokenEditorContext";
import { getContrastSummaryFromColors } from "../roleValueHelpers/roleValueHelpers";
import css from "./ContrastBadge.module.css";
import type { ResolvedTypeStyle } from "../../../videoTheme/videoTheme.types";
import type { ReactNode } from "react";

type Props = {
  color: string;
  style?: Pick<ResolvedTypeStyle, "fontSize" | "fontWeight">;
};
/**
 * The WCAG contrast of a text colour against the theme's ground, as a badge.
 */
export function ContrastBadge({ color, style }: Readonly<Props>): ReactNode {
  const { theme } = useTokenEditor();
  const { level, ratio } = getContrastSummaryFromColors({
    color,
    ground: theme.semantic.color.ground,
    style,
  });
  const isFailing = level === "fail";
  return (
    <Badge
      size="xs"
      variant="light"
      color={isFailing ? "red" : "green"}
      classNames={{
        root: clsx(css.contrastBadge, isFailing && css.contrastBadgeFail),
      }}
    >
      {level === "fail" ? `Low contrast ${ratio}:1` : `${level} ${ratio}:1`}
    </Badge>
  );
}

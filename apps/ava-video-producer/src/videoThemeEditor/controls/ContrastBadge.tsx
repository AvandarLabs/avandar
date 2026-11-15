import { Badge } from "@mantine/core";
import clsx from "clsx";
import { useTokenEditor } from "../TokenEditorContext/TokenEditorContext";
import css from "./controls.module.css";
import { getContrastSummaryFromColors } from "./roleValues/roleValues";
import type { ResolvedTypeStyle } from "../../videoTheme/videoTheme.types";

/** The WCAG contrast of a text colour against the theme's ground, as a badge. */
export function ContrastBadge({
  color,
  style,
}: Readonly<{
  color: string;
  style?: Pick<ResolvedTypeStyle, "fontSize" | "fontWeight">;
}>) {
  const { theme } = useTokenEditor();
  const { level, ratio } = getContrastSummaryFromColors(
    color,
    theme.semantic.color.ground,
    style,
  );
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

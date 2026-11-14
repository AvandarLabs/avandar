import { useLingui } from "@lingui/react/macro";
import { Badge } from "@mantine/core";
import { useTokenEditor } from "../TokenEditorContext/TokenEditorContext";
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
  const { t } = useLingui();
  const { theme } = useTokenEditor();
  const { level, ratio } = getContrastSummaryFromColors(
    color,
    theme.semantic.color.ground,
    style,
  );
  return (
    <Badge size="xs" variant="light" color={level === "fail" ? "red" : "green"}>
      {level === "fail" ? t`Low contrast ${ratio}:1` : t`${level} ${ratio}:1`}
    </Badge>
  );
}

import { AtlasSelect } from "../../gallery/AtlasSelect/AtlasSelect";
import {
  VIDEO_FONT_IDS,
  VIDEO_FONT_REGISTRY,
} from "../../videoTheme/videoFontRegistry/videoFontRegistryHelpers";
import { useRowHasIssue } from "../RowIssueContext/RowIssueContext";
import type { ValueControlProps } from "./valueControl.types";
import type { ReactNode } from "react";

/**
 * A font token: one of the registered families, marked when its glyph widths
 * are measured.
 */
export function FontValueControl({
  label,
  definition,
  value,
  onChange,
}: ValueControlProps): ReactNode {
  const hasIssue = useRowHasIssue();
  const data = VIDEO_FONT_IDS.map((id) => {
    const font = VIDEO_FONT_REGISTRY[id];
    const name = font.label;
    return {
      value: definition.kind === "fontStack" ? font.stack : id,
      label: font.measured ? `${name}, measured widths` : name,
    };
  });
  return (
    <AtlasSelect
      aria-label={label}
      error={hasIssue}
      data={data}
      value={String(value)}
      onChange={(selectedOption) => {
        return selectedOption && onChange(selectedOption);
      }}
    />
  );
}

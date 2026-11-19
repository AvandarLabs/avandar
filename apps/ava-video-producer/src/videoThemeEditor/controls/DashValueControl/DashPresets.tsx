import { SegmentedControl } from "@mantine/core";
import { useRowIssueAriaProps } from "../../RowIssueContext/RowIssueContext";
import { formatDashPattern } from "../controlValueHelpers/controlValueHelpers";

const DASH_PRESETS: Readonly<Record<string, readonly number[]>> = {
  solid: [],
  dotted: [1, 4],
  dashed: [6, 6],
};

type Props = Readonly<{
  pattern: readonly number[];
  onChange: (pattern: readonly number[]) => void;
}>;

/** Solid, dotted, and dashed presets. Shows no selection for a custom pattern. */
export function DashPresets({ pattern, onChange }: Props) {
  const issueAriaProps = useRowIssueAriaProps();
  const patternText = formatDashPattern(pattern);
  const preset =
    Object.entries(DASH_PRESETS).find(([, dashes]) => {
      return formatDashPattern(dashes) === patternText;
    })?.[0] ?? "";
  return (
    <SegmentedControl
      size="xs"
      aria-label="Dash preset"
      {...issueAriaProps}
      value={preset}
      data={[
        { value: "solid", label: "Solid" },
        { value: "dotted", label: "Dotted" },
        { value: "dashed", label: "Dashed" },
      ]}
      onChange={(presetName) => {
        return onChange(DASH_PRESETS[presetName] ?? []);
      }}
    />
  );
}

import { Group, Switch, TextInput } from "@mantine/core";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { ReactNode } from "react";

type Props = {
  label: string;
  visibilityLabel: string;
  headerLine: AvaMapConfig.ExportHeaderLine;

  /**
   * The live fallback text shown as a placeholder. An empty stored value
   * means "use this fallback", so it is never written into `value`: an
   * author who renames the map should not be left with a stale printed
   * line frozen at the moment they opened the sheet.
   */
  placeholder: string | undefined;
  onChange: (headerLine: AvaMapConfig.ExportHeaderLine) => void;
};

/** One optional header line (title or subtitle): its text and its switch. */
export function ExportSheetHeaderLineField({
  label,
  visibilityLabel,
  headerLine,
  placeholder,
  onChange,
}: Props): ReactNode {
  return (
    <Group align="flex-end" gap="xs" wrap="nowrap">
      <TextInput
        label={label}
        placeholder={placeholder}
        value={headerLine.text}
        style={{ flex: 1 }}
        onChange={(event) => {
          onChange({ ...headerLine, text: event.currentTarget.value });
        }}
      />
      <Switch
        aria-label={visibilityLabel}
        checked={headerLine.isVisible}
        onChange={(event) => {
          onChange({ ...headerLine, isVisible: event.currentTarget.checked });
        }}
      />
    </Group>
  );
}

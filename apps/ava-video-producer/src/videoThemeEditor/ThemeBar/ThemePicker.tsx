import { Badge, Group } from "@mantine/core";
import { AtlasSelect } from "../../gallery/AtlasSelect/AtlasSelect";
import type { ThemeSummary } from "../ThemeApi/ThemeApi";

type Props = Readonly<{
  themes: readonly ThemeSummary[];
  themeId: string;
  isDirty: boolean;
  isDisabled: boolean;
  onSelectTheme: (themeId: string) => void;
}>;

/** The theme select, with an unsaved-changes badge beside it. */
export function ThemePicker({
  themes,
  themeId,
  isDirty,
  isDisabled,
  onSelectTheme,
}: Props) {
  return (
    <Group gap="xs" wrap="nowrap">
      <AtlasSelect
        aria-label="Theme"
        data={themes.map(({ id, label, builtIn }) => {
          return {
            value: id,
            label: builtIn ? `${label} (built-in)` : label,
          };
        })}
        value={themeId}
        disabled={isDisabled}
        onChange={(id) => {
          return id && onSelectTheme(id);
        }}
      />
      {isDirty ? (
        <Badge size="sm" variant="light">
          {"Unsaved changes"}
        </Badge>
      ) : null}
    </Group>
  );
}

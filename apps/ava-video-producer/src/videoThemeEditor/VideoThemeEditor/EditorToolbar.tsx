import { Badge, SegmentedControl, Switch, TextInput } from "@mantine/core";
import css from "./VideoThemeEditor.module.css";
import type { ThemeEditScope } from "../themeDraft/themeDraft";

/** Which tier tab is open. */
export type EditorTier = "component" | "semantic" | "atomic";

/** The editor's search, tier, and usage filter. */
export type EditorFilters = Readonly<{
  tier: EditorTier;
  query: string;
  isUsedOnly: boolean;
}>;

/** The item the host is previewing, for item-scope edits. */
export type EditorItem = Readonly<{
  id: string;
  /** What the item-scope switch says, such as "This composition only". */
  scopeLabel: string;
  /** The item as a sentence subject, such as "This composition". */
  name: string;
}>;

type Props = Readonly<{
  filters: EditorFilters;
  onFiltersChange: (filters: EditorFilters) => void;
  scope: ThemeEditScope;
  item?: EditorItem;
  overrideCount: number;
  hasUsage: boolean;
  onScopeChange: (scope: ThemeEditScope) => void;
}>;

type ScopeSwitchProps = Readonly<{
  scope: ThemeEditScope;
  item: EditorItem;
  overrideCount: number;
  onScopeChange: (scope: ThemeEditScope) => void;
}>;

function ScopeSwitch({
  scope,
  item,
  overrideCount,
  onScopeChange,
}: ScopeSwitchProps) {
  return (
    <div className={css.scope}>
      <SegmentedControl
        size="xs"
        fullWidth
        aria-label="Edit scope"
        value={scope.kind}
        data={[
          { value: "theme", label: "Whole theme" },
          { value: "item", label: item.scopeLabel },
        ]}
        onChange={(kind) =>
          onScopeChange(
            kind === "item"
              ? { kind: "item", itemId: item.id }
              : { kind: "theme" },
          )
        }
      />
      {overrideCount > 0 ? (
        <Badge
          size="xs"
          variant="light"
          classNames={{ root: css.overridesBadge }}
        >
          {`${overrideCount} ${overrideCount === 1 ? "change" : "changes"}`}
        </Badge>
      ) : null}
    </div>
  );
}

function UsageFilter({
  filters,
  onFiltersChange,
}: Readonly<{
  filters: EditorFilters;
  onFiltersChange: (filters: EditorFilters) => void;
}>) {
  return (
    <div className={css.usage}>
      <Switch
        size="xs"
        label="Only settings used by this preview"
        checked={filters.isUsedOnly}
        onChange={(event) =>
          onFiltersChange({
            ...filters,
            isUsedOnly: event.currentTarget.checked,
          })
        }
      />
      {filters.isUsedOnly ? (
        <p className={css.hint}>
          {
            "Shows what the preview has used so far. Play it once to find the rest."
          }
        </p>
      ) : null}
    </div>
  );
}

/** The editor's scope switch, search, and usage filter. */
export function EditorToolbar({
  filters,
  onFiltersChange,
  scope,
  item,
  overrideCount,
  hasUsage,
  onScopeChange,
}: Props) {
  return (
    <div className={css.toolbar}>
      {item ? (
        <ScopeSwitch
          scope={scope}
          item={item}
          overrideCount={overrideCount}
          onScopeChange={onScopeChange}
        />
      ) : null}
      <TextInput
        size="xs"
        type="search"
        aria-label="Search settings"
        placeholder="Search by name, path, or description"
        value={filters.query}
        onChange={(event) =>
          onFiltersChange({ ...filters, query: event.currentTarget.value })
        }
      />
      {hasUsage ? (
        <UsageFilter filters={filters} onFiltersChange={onFiltersChange} />
      ) : null}
    </div>
  );
}

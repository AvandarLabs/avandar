import { useLingui } from "@lingui/react/macro";
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
export type EditorItem = Readonly<{ id: string; scopeLabel: string }>;

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
  const { t } = useLingui();
  return (
    <div className={css.scope}>
      <SegmentedControl
        size="xs"
        fullWidth
        aria-label={t`Edit scope`}
        value={scope.kind}
        data={[
          { value: "theme", label: t`All items (theme)` },
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
          {t`Overrides: ${overrideCount}`}
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
  const { t } = useLingui();
  return (
    <div className={css.usage}>
      <Switch
        size="xs"
        label={t`Only tokens this item uses`}
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
          {t`Shows the tokens seen so far. Play the preview once to discover the rest.`}
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
  const { t } = useLingui();
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
        aria-label={t`Search tokens`}
        placeholder={t`Search by name, path, or description`}
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

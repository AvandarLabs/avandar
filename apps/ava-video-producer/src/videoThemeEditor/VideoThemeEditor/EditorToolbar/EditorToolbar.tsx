import { TextInput } from "@mantine/core";
import css from "./EditorToolbar.module.css";
import { ScopeSwitch } from "./ScopeSwitch/ScopeSwitch";
import { UsageFilter } from "./UsageFilter/UsageFilter";
import type { ThemeEditScope } from "../../themeDraft/themeDraft";
import type { ReactNode } from "react";

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

/** The editor's scope switch, search, and usage filter. */
export function EditorToolbar({
  filters,
  onFiltersChange,
  scope,
  item,
  overrideCount,
  hasUsage,
  onScopeChange,
}: Props): ReactNode {
  return (
    <div className={css.editorToolbar}>
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
        onChange={(event) => {
          return onFiltersChange({
            ...filters,
            query: event.currentTarget.value,
          });
        }}
      />
      {hasUsage ? (
        <UsageFilter filters={filters} onFiltersChange={onFiltersChange} />
      ) : null}
    </div>
  );
}

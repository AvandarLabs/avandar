import { useLingui } from "@lingui/react/macro";
import { SegmentedControl } from "@mantine/core";
import { useMemo, useState, type ReactNode } from "react";
import { useDraftTheme } from "../resolveDraftTheme/useDraftTheme";
import {
  countItemOverrides,
  type ThemeDraft,
  type ThemeEditScope,
} from "../themeDraft/themeDraft";
import { useTokenCopy } from "../tokenCopy/useTokenCopy";
import { TokenEditorContext } from "../TokenEditorContext/TokenEditorContext";
import { useTokenRowLabel } from "../TokenRow/TokenRow";
import {
  filterTokenRows,
  listEmptyAtomicScaleGroups,
  listTokenRows,
  type TokenRow,
} from "../tokenRows/tokenRows";
import {
  EditorToolbar,
  type EditorFilters,
  type EditorItem,
  type EditorTier,
} from "./EditorToolbar";
import { EssentialsGroup } from "./EssentialsGroup";
import { TokenSections } from "./TokenSections";
import { useTokenEditorValue } from "./useTokenEditorValue";
import css from "./VideoThemeEditor.module.css";
import type { VideoThemeLibrary } from "../../videoTheme/videoTheme.types";

type Props = Readonly<{
  library: VideoThemeLibrary;
  themeId: string;
  draft: ThemeDraft;
  scope: ThemeEditScope;
  /** The previewed item, which enables item-scope edits. */
  item?: EditorItem;
  /** Token paths the previewed item read; enables the usage filter. */
  usedTokens?: readonly string[];
  /** Pinned above the toolbar, so it stays visible while the rows scroll. */
  header?: ReactNode;
  onDraftChange: (draft: ThemeDraft) => void;
  onScopeChange: (scope: ThemeEditScope) => void;
}>;

function useVisibleRows(
  rows: readonly TokenRow[],
  filters: EditorFilters,
  usedTokens: readonly string[] | undefined,
) {
  const copy = useTokenCopy();
  const toLabel = useTokenRowLabel();
  return useMemo(
    () =>
      filterTokenRows(rows, {
        tiers:
          filters.tier === "atomic" ? ["atomic", "mantine"] : [filters.tier],
        query: filters.query,
        usedTokens: filters.isUsedOnly ? usedTokens : undefined,
        getText: (row) => `${toLabel(row)} ${copy(row.definition.description)}`,
      }),
    [rows, filters, usedTokens, copy, toLabel],
  );
}

/**
 * The search, tier, and usage filters, the rows they leave visible, and the
 * empty atomic scales to offer while the unfiltered atomic tier is open.
 */
function useEditorFilters(
  rows: readonly TokenRow[],
  usedTokens: readonly string[] | undefined,
) {
  const [filters, setFilters] = useState<EditorFilters>({
    tier: "semantic",
    query: "",
    isUsedOnly: false,
  });
  const visibleRows = useVisibleRows(rows, filters, usedTokens);
  const showsEmptyScales =
    filters.tier === "atomic" && !filters.query && !filters.isUsedOnly;
  const emptyGroups = useMemo(
    () => (showsEmptyScales ? listEmptyAtomicScaleGroups(rows) : []),
    [showsEmptyScales, rows],
  );
  return { filters, setFilters, visibleRows, emptyGroups };
}

/** The draft's rows and the context its controls read. */
function useEditorRows(props: Props) {
  const { library, themeId, draft, scope, item, onDraftChange } = props;
  const draftTheme = useDraftTheme({ library, themeId, draft, scope });
  // Theme scope shows the previewed item's own values, so it resolves the item too.
  const itemScope = useMemo<ThemeEditScope>(
    () => (item ? { kind: "item", itemId: item.id } : { kind: "theme" }),
    [item],
  );
  const itemTheme = useDraftTheme({
    library,
    themeId,
    draft,
    scope: itemScope,
  }).theme;
  const rows = useMemo(
    () =>
      listTokenRows({
        library,
        themeId,
        draft,
        scope,
        merged: draftTheme.merged,
        theme: draftTheme.theme,
        ...(item ? { item: { id: item.id, theme: itemTheme } } : {}),
      }),
    [
      library,
      themeId,
      draft,
      scope,
      draftTheme.merged,
      draftTheme.theme,
      item,
      itemTheme,
    ],
  );
  const context = useTokenEditorValue({
    draft,
    scope,
    rows,
    theme: draftTheme.theme,
    issues: draftTheme.issues,
    item,
    onDraftChange,
  });
  return { rows, context };
}

type TierSwitchProps = Readonly<{
  filters: EditorFilters;
  onFiltersChange: (filters: EditorFilters) => void;
}>;

function TierSwitch({ filters, onFiltersChange }: TierSwitchProps) {
  const { t } = useLingui();
  return (
    <SegmentedControl
      size="xs"
      fullWidth
      aria-label={t`Kind of setting`}
      value={filters.tier}
      data={[
        {
          value: "component",
          label: t`Parts`,
        },
        { value: "semantic", label: t`Styles` },
        { value: "atomic", label: t`Base values` },
      ]}
      onChange={(tier) =>
        onFiltersChange({ ...filters, tier: tier as EditorTier })
      }
    />
  );
}

/**
 * The design-token editor: Essentials, then component, semantic, and atomic
 * tokens in searchable sections, editing a draft for the whole theme or one
 * item. It is controlled and knows nothing about the gallery, so any
 * producer surface can host it with a theme library and a draft.
 */
export function VideoThemeEditor(props: Props) {
  const { t } = useLingui();
  const { rows, context } = useEditorRows(props);
  const { filters, setFilters, visibleRows, emptyGroups } = useEditorFilters(
    rows,
    props.usedTokens,
  );
  const overrideCount = props.item
    ? countItemOverrides({
        library: props.library,
        themeId: props.themeId,
        draft: props.draft,
        itemId: props.item.id,
      })
    : 0;
  return (
    <TokenEditorContext.Provider value={context}>
      <section className={css.editor} aria-label={t`Design tokens`}>
        <div className={css.pinned}>
          {props.header}
          <EditorToolbar
            filters={filters}
            onFiltersChange={setFilters}
            scope={props.scope}
            item={props.item}
            overrideCount={overrideCount}
            hasUsage={props.usedTokens !== undefined}
            onScopeChange={props.onScopeChange}
          />
        </div>
        {filters.query ? null : <EssentialsGroup rows={rows} />}
        <TierSwitch filters={filters} onFiltersChange={setFilters} />
        <TokenSections
          rows={visibleRows}
          allRows={rows}
          emptyGroups={emptyGroups}
        />
      </section>
    </TokenEditorContext.Provider>
  );
}

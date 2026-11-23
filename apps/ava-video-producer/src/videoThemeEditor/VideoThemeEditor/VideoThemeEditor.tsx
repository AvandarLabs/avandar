import { useMemo, useState, type ReactNode } from "react";
import { useDraftTheme } from "../DraftThemeResolution/useDraftTheme";
import {
  type ThemeDraft,
  type ThemeEditScope,
  ThemeDrafts,
} from "../ThemeDrafts/ThemeDrafts";
import { TokenEditorContext } from "../TokenEditorContext";
import { useTokenRowLabel } from "../TokenRow/useTokenRowLabel";
import { TokenRows } from "../TokenRows/TokenRows";
import { type TokenRow } from "../TokenRows/TokenRows.types";
import {
  EditorToolbar,
  type EditorFilters,
  type EditorItem,
} from "./EditorToolbar/EditorToolbar";
import { EssentialsGroup } from "./EssentialsGroup/EssentialsGroup";
import { TierSwitch } from "./TierSwitch";
import { TokenSections } from "./TokenSections/TokenSections";
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
function useEditorView(
  options: Props,
): Readonly<
  ReturnType<typeof useEditorRows> &
    ReturnType<typeof useEditorFilters> & { overrideCount: number }
> {
  const { library, themeId, draft, scope, item, usedTokens, onDraftChange } =
    options;
  const { rows, context } = useEditorRows({
    library,
    themeId,
    draft,
    scope,
    item,
    onDraftChange,
  });
  const { filters, setFilters, visibleRows, emptyGroups } = useEditorFilters({
    rows,
    usedTokens,
  });
  const overrideCount = item
    ? ThemeDrafts.countItemOverrides({
        library,
        themeId,
        draft,
        itemId: item.id,
      })
    : 0;
  return {
    rows,
    context,
    filters,
    setFilters,
    visibleRows,
    emptyGroups,
    overrideCount,
  };
}
function useVisibleRows({
  rows,
  filters,
  usedTokens,
}: Readonly<{
  rows: readonly TokenRow[];
  filters: EditorFilters;
  usedTokens: readonly string[] | undefined;
}>) {
  const toLabel = useTokenRowLabel();
  return useMemo(() => {
    return TokenRows.filterTokenRows({
      rows,
      filter: {
        tiers:
          filters.tier === "atomic" ? ["atomic", "mantine"] : [filters.tier],
        query: filters.query,
        usedTokens: filters.isUsedOnly ? usedTokens : undefined,
        getText: (row) => {
          return `${toLabel(row)} ${row.definition.description}`;
        },
      },
    });
  }, [rows, filters, usedTokens, toLabel]);
}
/**
 * The search, tier, and usage filters, the rows they leave visible, and the
 * empty atomic scales to offer while the unfiltered atomic tier is open.
 */
function useEditorFilters({
  rows,
  usedTokens,
}: Readonly<{
  rows: readonly TokenRow[];
  usedTokens: readonly string[] | undefined;
}>) {
  const [filters, setFilters] = useState<EditorFilters>({
    tier: "semantic",
    query: "",
    isUsedOnly: false,
  });
  const visibleRows = useVisibleRows({
    rows,
    filters,
    usedTokens,
  });
  const showsEmptyScales =
    filters.tier === "atomic" && !filters.query && !filters.isUsedOnly;
  const emptyGroups = useMemo(() => {
    return showsEmptyScales ? TokenRows.listEmptyAtomicScaleGroups(rows) : [];
  }, [showsEmptyScales, rows]);
  return { filters, setFilters, visibleRows, emptyGroups };
}
/**
 * The theme as the previewed item sees it. Theme scope shows the item's own
 * values, so it resolves the item too.
 */
function useItemTheme({
  library,
  themeId,
  draft,
  item,
}: Pick<Props, "library" | "themeId" | "draft" | "item">) {
  const itemScope = useMemo<ThemeEditScope>(() => {
    return item ? { kind: "item", itemId: item.id } : { kind: "theme" };
  }, [item]);
  return useDraftTheme({ library, themeId, draft, scope: itemScope }).theme;
}
/** The draft's rows and the context its controls read. */
function useEditorRows({
  library,
  themeId,
  draft,
  scope,
  item,
  onDraftChange,
}: Pick<
  Props,
  "library" | "themeId" | "draft" | "scope" | "item" | "onDraftChange"
>) {
  const draftTheme = useDraftTheme({ library, themeId, draft, scope });
  const itemTheme = useItemTheme({ library, themeId, draft, item });
  const rows = useMemo(() => {
    return TokenRows.listTokenRows({
      library,
      themeId,
      draft,
      scope,
      merged: draftTheme.merged,
      theme: draftTheme.theme,
      ...(item ? { item: { id: item.id, theme: itemTheme } } : {}),
    });
  }, [
    library,
    themeId,
    draft,
    scope,
    draftTheme.merged,
    draftTheme.theme,
    item,
    itemTheme,
  ]);
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
/**
 * The design-token editor: Essentials, then component, semantic, and atomic
 * tokens in searchable sections, editing a draft for the whole theme or one
 * item. It is controlled and knows nothing about the gallery, so any
 * producer surface can host it with a theme library and a draft.
 */
export function VideoThemeEditor(options: Props): ReactNode {
  const { scope, item, header, usedTokens, onScopeChange } = options;
  const {
    rows,
    context,
    filters,
    setFilters,
    visibleRows,
    emptyGroups,
    overrideCount,
  } = useEditorView(options);
  return (
    <TokenEditorContext.Provider value={context}>
      <section className={css.videoThemeEditor} aria-label="Design tokens">
        <div className={css.videoThemeEditorPinned}>
          {header}
          <EditorToolbar
            filters={filters}
            onFiltersChange={setFilters}
            scope={scope}
            item={item}
            overrideCount={overrideCount}
            hasUsage={usedTokens !== undefined}
            onScopeChange={onScopeChange}
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

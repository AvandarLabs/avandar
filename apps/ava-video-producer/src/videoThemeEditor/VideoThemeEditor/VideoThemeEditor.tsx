import { useLingui } from "@lingui/react/macro";
import { SegmentedControl } from "@mantine/core";
import { useMemo, useState } from "react";
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

/** The draft's rows and the context its controls read. */
function useEditorRows(props: Props) {
  const { library, themeId, draft, scope, onDraftChange } = props;
  const draftTheme = useDraftTheme({ library, themeId, draft, scope });
  const rows = useMemo(
    () =>
      listTokenRows({
        library,
        themeId,
        draft,
        scope,
        merged: draftTheme.merged,
        theme: draftTheme.theme,
      }),
    [library, themeId, draft, scope, draftTheme.merged, draftTheme.theme],
  );
  const context = useTokenEditorValue({
    draft,
    scope,
    rows,
    theme: draftTheme.theme,
    issues: draftTheme.issues,
    onDraftChange,
  });
  return { rows, context };
}

type TierSwitchProps = Readonly<{
  filters: EditorFilters;
  onFiltersChange: (filters: EditorFilters) => void;
  hasItem: boolean;
}>;

function TierSwitch({ filters, onFiltersChange, hasItem }: TierSwitchProps) {
  const { t } = useLingui();
  return (
    <SegmentedControl
      size="xs"
      fullWidth
      aria-label={t`Token layer`}
      value={filters.tier}
      data={[
        {
          value: "component",
          label: hasItem ? t`Components for this item` : t`Components`,
        },
        { value: "semantic", label: t`Semantic` },
        { value: "atomic", label: t`Atomic` },
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
  const [filters, setFilters] = useState<EditorFilters>({
    tier: "semantic",
    query: "",
    isUsedOnly: false,
  });
  const visibleRows = useVisibleRows(rows, filters, props.usedTokens);
  const showsEmptyScales =
    filters.tier === "atomic" && !filters.query && !filters.isUsedOnly;
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
        <EditorToolbar
          filters={filters}
          onFiltersChange={setFilters}
          scope={props.scope}
          item={props.item}
          overrideCount={overrideCount}
          hasUsage={props.usedTokens !== undefined}
          onScopeChange={props.onScopeChange}
        />
        {filters.query ? null : <EssentialsGroup rows={rows} />}
        <TierSwitch
          filters={filters}
          onFiltersChange={setFilters}
          hasItem={props.item !== undefined}
        />
        <TokenSections
          rows={visibleRows}
          emptyGroups={showsEmptyScales ? listEmptyAtomicScaleGroups(rows) : []}
        />
      </section>
    </TokenEditorContext.Provider>
  );
}

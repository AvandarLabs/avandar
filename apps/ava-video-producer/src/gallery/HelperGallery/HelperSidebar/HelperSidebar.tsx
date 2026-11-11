import { useLingui } from "@lingui/react/macro";
import { useEffect, useRef } from "react";
import { HELPER_CATALOG } from "../helperCatalog";
import { ALL_CATEGORIES } from "../helperSelection/helperSelection";
import { useHelperCopy } from "../useHelperCopy";
import css from "./HelperSidebar.module.css";
import type { HelperEntry } from "../helperCatalog.types";
import type { HelperSelection } from "../helperSelection/helperSelection";

type Props = {
  entries: readonly HelperEntry[];
  selection: HelperSelection;
  onSelect: (helperId: string) => void;
  onCategoryChange: (category: string) => void;
  onQueryChange: (query: string) => void;
};

/**
 * Scrolls the sidebar, never the page, so the selected entry is visible,
 * for example after opening a deep link to a helper far down the list.
 */
function useSelectedEntryInView(selectedId: string) {
  const sidebar = useRef<HTMLElement>(null);
  useEffect(() => {
    const container = sidebar.current;
    const entry = container?.querySelector<HTMLElement>(
      '[aria-current="true"]',
    );
    if (!container || !entry) {
      return;
    }
    // The sidebar is positioned, so it is the entry's offset parent.
    const top = entry.offsetTop;
    const isVisible =
      top >= container.scrollTop &&
      top + entry.offsetHeight <= container.scrollTop + container.clientHeight;
    if (!isVisible) {
      container.scrollTop = top - container.clientHeight / 3;
    }
  }, [selectedId]);
  return sidebar;
}

/** The number of catalogued helpers in one category. */
function _countHelpersInCategory(category: string): number {
  return HELPER_CATALOG.helpers.filter((helper) => helper.category === category)
    .length;
}

/** The category filter, each option with its helper count. */
function CategorySelect({
  category,
  onCategoryChange,
}: {
  category: string;
  onCategoryChange: (category: string) => void;
}) {
  const { t } = useLingui();
  const translate = useHelperCopy();
  const total = HELPER_CATALOG.helpers.length;
  return (
    <select
      className={css.field}
      aria-label={t`Helper category`}
      value={category}
      onChange={(event) => onCategoryChange(event.target.value)}
    >
      <option value={ALL_CATEGORIES}>{t`All helpers (${total})`}</option>
      {HELPER_CATALOG.categories.map((item) => (
        <option key={item.id} value={item.id}>
          {`${translate(item.title)} (${_countHelpersInCategory(item.id)})`}
        </option>
      ))}
    </select>
  );
}

/** Search, a category filter, and the matching helpers grouped by category. */
export function HelperSidebar({
  entries,
  selection,
  onSelect,
  onCategoryChange,
  onQueryChange,
}: Props) {
  const { t } = useLingui();
  const sidebar = useSelectedEntryInView(selection.helperId);
  return (
    <aside
      ref={sidebar}
      className={css.sidebar}
      aria-label={t`Choose a helper`}
    >
      <input
        className={css.field}
        type="search"
        aria-label={t`Search helpers`}
        placeholder={t`Search helpers or exports`}
        value={selection.query}
        onChange={(event) => onQueryChange(event.target.value)}
      />
      <CategorySelect
        category={selection.category}
        onCategoryChange={onCategoryChange}
      />
      <HelperGroups
        entries={entries}
        selectedId={selection.helperId}
        onSelect={onSelect}
      />
      {entries.length === 0 ? (
        <p
          className={css.empty}
        >{t`No matching helpers. Try another search.`}</p>
      ) : null}
    </aside>
  );
}

type GroupsProps = {
  entries: readonly HelperEntry[];
  selectedId: string;
  onSelect: (helperId: string) => void;
};

/** The matching helpers under their category headings, in catalog order. */
function HelperGroups({ entries, selectedId, onSelect }: GroupsProps) {
  const translate = useHelperCopy();
  return HELPER_CATALOG.categories.map((category) => {
    const helpers = entries.filter((helper) => helper.category === category.id);
    if (helpers.length === 0) {
      return null;
    }
    return (
      <section
        key={category.id}
        aria-labelledby={`helper-group-${category.id}`}
      >
        <h2 id={`helper-group-${category.id}`} className={css.groupTitle}>
          {translate(category.title)}
        </h2>
        {helpers.map((helper) => (
          <button
            key={helper.id}
            type="button"
            className={css.entry}
            aria-current={helper.id === selectedId}
            onClick={() => onSelect(helper.id)}
          >
            <strong>{translate(helper.title)}</strong>
            <code>{helper.exports.join(", ")}</code>
          </button>
        ))}
      </section>
    );
  });
}

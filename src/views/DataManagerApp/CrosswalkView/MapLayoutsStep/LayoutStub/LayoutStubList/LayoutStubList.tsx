import { useLingui } from "@lingui/react/macro";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useId, useRef } from "react";
import css from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/LayoutStub/LayoutStub.module.css";
import { LayoutStubRow } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/LayoutStub/LayoutStubRow";
import { useLayoutListKeyboard } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/LayoutStub/useLayoutListKeyboard";
import type { CrosswalkLayout } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout";
import type { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";
import type { LayoutListKeyboard } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/LayoutStub/useLayoutListKeyboard";
import type { Virtualizer } from "@tanstack/react-virtual";
import type { ReactNode, RefObject } from "react";

/** Past this many layouts the stub renders only the rows in view. */
export const LAYOUT_STUB_VIRTUAL_THRESHOLD = 100;

/** A first guess at a row's height, corrected once each row is measured. */
const ESTIMATED_ROW_HEIGHT_PX = 52;

type LayoutVirtualizer = Virtualizer<HTMLDivElement, Element>;

/** The stub's layouts, the selected one, and what selecting does. */
export type LayoutStubListProps = {
  layouts: readonly CrosswalkDraft.Layout[];
  datasetsById: ReadonlyMap<string, CrosswalkLayout.Dataset>;
  selectedLayoutId: CrosswalkLayout.Id | undefined;
  /** Called on click, Enter, or Space; the caller saves a dirty draft first. */
  onSelectLayout: (layoutId: CrosswalkLayout.Id) => void;
};

type RowOptions = {
  props: Readonly<LayoutStubListProps>;
  keyboard: LayoutListKeyboard;
  getOptionId: (layoutId: CrosswalkLayout.Id) => string;
};

/** The virtualizer for a long list, or undefined for a short one. */
function useLayoutVirtualizer(
  layouts: readonly CrosswalkDraft.Layout[],
  scrollerRef: RefObject<HTMLDivElement | null>,
): LayoutVirtualizer | undefined {
  const isVirtual = layouts.length > LAYOUT_STUB_VIRTUAL_THRESHOLD;
  const virtualizer = useVirtualizer({
    count: layouts.length,
    enabled: isVirtual,
    getScrollElement: () => {
      return scrollerRef.current;
    },
    estimateSize: () => {
      return ESTIMATED_ROW_HEIGHT_PX;
    },
    getItemKey: (index) => {
      return layouts[index]?.id ?? index;
    },
    overscan: 8,
  });
  return isVirtual ? virtualizer : undefined;
}

/** Scrolls a layout's row in through the virtualizer, for a long list only. */
function _makeScrollToLayout(
  virtualizer: LayoutVirtualizer | undefined,
  layoutIds: readonly CrosswalkLayout.Id[],
): ((layoutId: CrosswalkLayout.Id) => void) | undefined {
  if (!virtualizer) {
    return undefined;
  }
  return (layoutId) => {
    const index = layoutIds.indexOf(layoutId);
    if (index >= 0) {
      virtualizer.scrollToIndex(index, { align: "auto" });
    }
  };
}

/** One row, as the stub has always rendered it. */
function _renderRow(
  options: RowOptions & {
    layout: CrosswalkDraft.Layout;
    positionInList?: { position: number; count: number };
  },
): ReactNode {
  const { props, keyboard, layout } = options;
  return (
    <LayoutStubRow
      key={layout.id}
      layout={layout}
      datasetsById={props.datasetsById}
      optionId={options.getOptionId(layout.id)}
      isSelected={layout.id === props.selectedLayoutId}
      isActive={layout.id === keyboard.activeLayoutId}
      positionInList={options.positionInList}
      onSelect={() => {
        keyboard.setActiveLayoutId(layout.id);
        props.onSelectLayout(layout.id);
      }}
    />
  );
}

/**
 * The id the listbox points at: the active row's, unless a long list has
 * scrolled it out of the rendered window. An id with no element behind it
 * would point at nothing, so the listbox points at no row until the active
 * row is rendered again.
 */
function _getActiveDescendantId(
  options: Readonly<{
    activeLayoutId: CrosswalkLayout.Id | undefined;
    layouts: readonly CrosswalkDraft.Layout[];
    virtualizer: LayoutVirtualizer | undefined;
    getOptionId: (layoutId: CrosswalkLayout.Id) => string;
  }>,
): string | undefined {
  const { activeLayoutId, virtualizer } = options;
  if (!activeLayoutId) {
    return undefined;
  }
  const activeIndex = options.layouts.findIndex((layout) => {
    return layout.id === activeLayoutId;
  });
  const isRendered =
    !virtualizer ||
    virtualizer.getVirtualItems().some((item) => {
      return item.index === activeIndex;
    });
  return isRendered ? options.getOptionId(activeLayoutId) : undefined;
}

/** The rows in view, each in a wrapper the virtualizer measures and places. */
function _renderVirtualRows(
  options: RowOptions & { virtualizer: LayoutVirtualizer },
): ReactNode {
  const { props, virtualizer } = options;
  return (
    <div
      role="presentation"
      className={css.layoutStubListSizer}
      style={{ height: virtualizer.getTotalSize() }}
    >
      {virtualizer.getVirtualItems().map((item) => {
        const layout = props.layouts[item.index];
        return layout ? (
          <div
            key={layout.id}
            ref={virtualizer.measureElement}
            role="presentation"
            data-index={item.index}
            className={css.layoutStubVirtualRow}
            // Computed: each rendered row sits at its own measured offset.
            style={{ transform: `translateY(${item.start}px)` }}
          >
            {_renderRow({
              ...options,
              layout,
              positionInList: {
                position: item.index + 1,
                count: props.layouts.length,
              },
            })}
          </div>
        ) : null;
      })}
    </div>
  );
}

/**
 * The stub's layouts as a single-select listbox that keeps focus itself and
 * points at its active row with `aria-activedescendant`, since a row out of
 * view is not in the DOM to hold focus. Past `LAYOUT_STUB_VIRTUAL_THRESHOLD`
 * layouts only the rows in view are rendered, each saying where it sits in
 * the whole list, and the active row is scrolled in through the
 * virtualizer. Named after the step.
 */
export function LayoutStubList(
  props: Readonly<LayoutStubListProps>,
): ReactNode {
  const { t } = useLingui();
  const listId = useId();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const { layouts } = props;
  const virtualizer = useLayoutVirtualizer(layouts, scrollerRef);
  const layoutIds = layouts.map((layout) => {
    return layout.id;
  });
  const getOptionId = (layoutId: CrosswalkLayout.Id): string => {
    return `${listId}-${layoutId}`;
  };
  const keyboard = useLayoutListKeyboard({
    layoutIds,
    selectedLayoutId: props.selectedLayoutId,
    getOptionId,
    onSelectLayout: props.onSelectLayout,
    scrollToLayout: _makeScrollToLayout(virtualizer, layoutIds),
  });
  const rowOptions: RowOptions = { props, keyboard, getOptionId };
  const { activeLayoutId } = keyboard;
  return (
    <div
      ref={scrollerRef}
      role="listbox"
      tabIndex={0}
      aria-label={t`Map each dataset`}
      aria-activedescendant={_getActiveDescendantId({
        activeLayoutId,
        layouts,
        virtualizer,
        getOptionId,
      })}
      className={css.layoutStubList}
      onKeyDown={keyboard.onKeyDown}
    >
      {virtualizer
        ? _renderVirtualRows({ ...rowOptions, virtualizer })
        : layouts.map((layout) => {
            return _renderRow({ ...rowOptions, layout });
          })}
    </div>
  );
}

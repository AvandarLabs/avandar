import { useLingui } from "@lingui/react/macro";
import { useId } from "react";
import css from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/LayoutStub/LayoutStub.module.css";
import { LayoutStubRow } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/LayoutStub/LayoutStubRow";
import { MappedProgress } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/LayoutStub/MappedProgress";
import { useLayoutListKeyboard } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/LayoutStub/useLayoutListKeyboard";
import type { CrosswalkLayout } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout";
import type { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";
import type { ReactNode } from "react";

/** What the stub shows and the one thing it does. */
export type LayoutStubProps = {
  draft: CrosswalkDraft.T;
  datasetsById: ReadonlyMap<string, CrosswalkLayout.Dataset>;
  selectedLayoutId: CrosswalkLayout.Id | undefined;
  /**
   * Called when a layout is chosen by click, Enter, or Space. The step
   * passes `(layoutId) => { void flow.selectLayout(layoutId); }`, which
   * saves a dirty draft before it opens the layout.
   */
  onSelectLayout: (layoutId: CrosswalkLayout.Id) => void;
};

/** What the stub's listbox needs to render and choose a layout. */
type ListProps = {
  layouts: readonly CrosswalkDraft.Layout[];
  datasetsById: ReadonlyMap<string, CrosswalkLayout.Dataset>;
  selectedLayoutId: CrosswalkLayout.Id | undefined;
  onSelectLayout: (layoutId: CrosswalkLayout.Id) => void;
};

/** One option per layout, the reference first. */
function LayoutStubOptions(
  props: Readonly<
    Omit<ListProps, "onSelectLayout"> & {
      activeLayoutId: CrosswalkLayout.Id | undefined;
      getOptionId: (layoutId: CrosswalkLayout.Id) => string;
      onChoose: (layoutId: CrosswalkLayout.Id) => void;
    }
  >,
): ReactNode {
  return props.layouts.map((layout) => {
    return (
      <LayoutStubRow
        key={layout.id}
        layout={layout}
        datasetsById={props.datasetsById}
        optionId={props.getOptionId(layout.id)}
        isSelected={layout.id === props.selectedLayoutId}
        isActive={layout.id === props.activeLayoutId}
        onSelect={() => {
          props.onChoose(layout.id);
        }}
      />
    );
  });
}

/** The listbox: it keeps focus, and points at its active option. */
function LayoutStubList(props: Readonly<ListProps>): ReactNode {
  const { t } = useLingui();
  const listId = useId();
  const getOptionId = (layoutId: CrosswalkLayout.Id): string => {
    return `${listId}-${layoutId}`;
  };
  const keyboard = useLayoutListKeyboard({
    layoutIds: props.layouts.map((layout) => {
      return layout.id;
    }),
    selectedLayoutId: props.selectedLayoutId,
    getOptionId,
    onSelectLayout: props.onSelectLayout,
  });
  const { activeLayoutId } = keyboard;
  return (
    <div
      role="listbox"
      tabIndex={0}
      aria-label={t`Map each dataset`}
      aria-activedescendant={
        activeLayoutId ? getOptionId(activeLayoutId) : undefined
      }
      className={css.layoutStubList}
      onKeyDown={keyboard.onKeyDown}
    >
      <LayoutStubOptions
        layouts={props.layouts}
        datasetsById={props.datasetsById}
        selectedLayoutId={props.selectedLayoutId}
        activeLayoutId={activeLayoutId}
        getOptionId={getOptionId}
        onChoose={(layoutId) => {
          keyboard.setActiveLayoutId(layoutId);
          props.onSelectLayout(layoutId);
        }}
      />
    </div>
  );
}

/**
 * Step 2's flank: how many datasets are mapped, then every layout, the
 * reference first, each with its stamp. Skipped layouts stay listed. The
 * list is a single-select listbox named after the step.
 */
export function LayoutStub(props: Readonly<LayoutStubProps>): ReactNode {
  return (
    <div className={css.layoutStub}>
      <div className={css.layoutStubHeader}>
        <MappedProgress draft={props.draft} />
      </div>
      <LayoutStubList
        layouts={props.draft.layouts}
        datasetsById={props.datasetsById}
        selectedLayoutId={props.selectedLayoutId}
        onSelectLayout={props.onSelectLayout}
      />
    </div>
  );
}

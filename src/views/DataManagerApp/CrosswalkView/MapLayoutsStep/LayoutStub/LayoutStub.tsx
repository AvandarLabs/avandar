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

/**
 * Step 2's flank: how many datasets are mapped, then every layout, the
 * reference first, each with its stamp. Skipped layouts stay listed. The
 * list is a single-select listbox named after the step.
 */
export function LayoutStub(props: Readonly<LayoutStubProps>): ReactNode {
  const { t } = useLingui();
  const listId = useId();
  const { layouts } = props.draft;
  const getOptionId = (layoutId: CrosswalkLayout.Id): string => {
    return `${listId}-${layoutId}`;
  };
  const keyboard = useLayoutListKeyboard({
    layoutIds: layouts.map((layout) => {
      return layout.id;
    }),
    selectedLayoutId: props.selectedLayoutId,
    getOptionId,
    onSelectLayout: props.onSelectLayout,
  });
  const { activeLayoutId } = keyboard;
  return (
    <div className={css.layoutStub}>
      <div className={css.layoutStubHeader}>
        <MappedProgress draft={props.draft} />
      </div>
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
        {layouts.map((layout) => {
          return (
            <LayoutStubRow
              key={layout.id}
              layout={layout}
              datasetsById={props.datasetsById}
              optionId={getOptionId(layout.id)}
              isSelected={layout.id === props.selectedLayoutId}
              isActive={layout.id === activeLayoutId}
              onSelect={() => {
                keyboard.setActiveLayoutId(layout.id);
                props.onSelectLayout(layout.id);
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

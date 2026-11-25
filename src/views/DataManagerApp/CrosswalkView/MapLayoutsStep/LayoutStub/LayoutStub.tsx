import css from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/LayoutStub/LayoutStub.module.css";
import { LayoutStubList } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/LayoutStub/LayoutStubList/LayoutStubList";
import { MappedProgress } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/LayoutStub/MappedProgress";
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
 * reference first, each with its stamp. Skipped layouts stay listed. Past
 * 100 layouts the list renders only the rows in view (`LayoutStubList`).
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

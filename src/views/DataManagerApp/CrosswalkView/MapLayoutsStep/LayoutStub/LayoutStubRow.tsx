import { LayoutName } from "@/views/DataManagerApp/CrosswalkView/layoutLabel/LayoutName";
import { LayoutStamp } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/LayoutStub/LayoutStamp";
import css from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/LayoutStub/LayoutStub.module.css";
import type { CrosswalkLayout } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout";
import type { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";
import type { ReactNode } from "react";

/** One layout in the stub, as the stub renders it. */
export type LayoutStubRowProps = {
  layout: CrosswalkDraft.Layout;
  datasetsById: ReadonlyMap<string, CrosswalkLayout.Dataset>;
  /** The option's id, which the listbox points at while it is active. */
  optionId: string;
  isSelected: boolean;
  /** The option the keyboard is on. */
  isActive: boolean;
  /**
   * Where the row sits in the whole list, given when the list renders only
   * the rows in view, so a screen reader still hears "12 of 200".
   */
  positionInList?: { position: number; count: number };
  onSelect: () => void;
};

/**
 * One option of the stub's listbox: the layout's name, "+{count} with the
 * same layout", and its stamp. It takes no focus of its own. The listbox
 * keeps focus and handles keys.
 */
export function LayoutStubRow({
  layout,
  datasetsById,
  optionId,
  isSelected,
  isActive,
  positionInList,
  onSelect,
}: Readonly<LayoutStubRowProps>): ReactNode {
  return (
    <div
      id={optionId}
      role="option"
      aria-selected={isSelected}
      aria-posinset={positionInList?.position}
      aria-setsize={positionInList?.count}
      data-active={isActive || undefined}
      className={css.layoutStubRow}
      onClick={onSelect}
    >
      <LayoutName layout={layout} datasetsById={datasetsById} />
      <LayoutStamp layout={layout} />
    </div>
  );
}

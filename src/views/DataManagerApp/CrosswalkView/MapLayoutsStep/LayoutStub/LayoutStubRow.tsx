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
  onSelect: () => void;
};

/**
 * One option of the stub's listbox: the layout's name, "+{count} with the
 * same layout", and its stamp. It takes no focus of its own; the listbox
 * keeps focus and handles keys.
 */
export function LayoutStubRow({
  layout,
  datasetsById,
  optionId,
  isSelected,
  isActive,
  onSelect,
}: Readonly<LayoutStubRowProps>): ReactNode {
  return (
    <div
      id={optionId}
      role="option"
      aria-selected={isSelected}
      data-active={isActive || undefined}
      className={css.layoutStubRow}
      onClick={onSelect}
    >
      <LayoutName layout={layout} datasetsById={datasetsById} />
      <LayoutStamp layout={layout} />
    </div>
  );
}

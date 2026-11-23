import { useTokenEditor } from "../../TokenEditorContext";
import css from "./ItemOverrideNote.module.css";
import type { ReactNode } from "react";

type Props = Readonly<{ label: string }>;

/**
 * In theme scope, says the previewed item has its own value, so the control
 * below edits the theme's value and not the one the preview shows.
 */
export function ItemOverrideNote({ label }: Props): ReactNode {
  const { item } = useTokenEditor();
  if (!item) {
    return null;
  }
  const itemName = item.name;
  const scopeLabel = item.scopeLabel;
  const settingName = label.toLowerCase();
  return (
    <p className={css.itemOverrideNote}>
      {`${itemName} has its own ${settingName}. Choose "${scopeLabel}" to change it.`}
    </p>
  );
}

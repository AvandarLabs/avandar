import { Trans, useLingui } from "@lingui/react/macro";
import { ContentDraftModule } from "../ContentDraftModule/ContentDraftModule";
import { ContentField } from "../ContentField/ContentField";
import styles from "./CollectionItem.module.css";
import type { Props as CollectionFieldProps } from "../CollectionField/CollectionField";
import type { ReactNode } from "react";
type Props = CollectionFieldProps & {
  item: unknown;
  index: number;
  count: number;
};
/** A surviving row retains its input state when a preceding row is removed. */
export function CollectionItem({
  control,
  context,
  preset,
  state,
  onChange,
  index,
  item,
  count,
  itemPath: providedItemPath,
  ...remainingProps
}: Props): ReactNode {
  const { t } = useLingui();
  const path = [...context.path, index];
  const itemPath =
    item && typeof item === "object" && !Array.isArray(item)
      ? path
      : providedItemPath;
  return (
    <div className={styles.collectionItemRow}>
      <div className={styles.collectionItemRowHeader}>
        <span>
          <Trans>Item {index + 1}</Trans>
        </span>
        <button
          aria-label={t`Remove ${context.label} item ${index + 1}`}
          disabled={count <= control.minItems}
          onClick={() =>
            onChange(
              ContentDraftModule.removeItem({
                preset,
                state,
                path: context.path,
                index,
              }),
            )
          }
        >
          <Trans>Remove</Trans>
        </button>
      </div>
      {control.itemControls.map((child) => (
        <ContentField
          {...{
            ...remainingProps,
            control,
            context,
            preset,
            state,
            onChange,
            index,
            item,
            count,
            itemPath: providedItemPath,
          }}
          key={child.path}
          control={child}
          parentPath={path}
          itemPath={itemPath}
        />
      ))}
    </div>
  );
}

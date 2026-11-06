import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { StockCopyMessages } from "../../../../stock/i18n/StockCopyMessages";
import { CollectionItem } from "../CollectionItem/CollectionItem";
import { ContentDraftModule } from "../ContentDraftModule/ContentDraftModule";
import styles from "./CollectionField.module.css";
import type { StockControl } from "../../../../stock/contracts/StockContract.types";
import type { Props as ContentFieldProps } from "../ContentField/ContentField";
import type { ContentFieldContext } from "../useContentField";
import type { ReactNode } from "react";

/** Bounded arrays expose collection lengths through Add and Remove only. */
export type Props = ContentFieldProps & {
  control: Extract<
    StockControl,
    {
      kind: "collection";
    }
  >;
  context: ContentFieldContext;
};
/** Collection rows use editor-only keys even when content has no ID. */
export function CollectionField({
  control,
  context,
  preset,
  state,
  onChange,
  ...remainingProps
}: Readonly<Props>): ReactNode {
  const { i18n } = useLingui();
  const value = StockCopyMessages.getValueFromPath({
    value: state.draft,
    path: context.path,
  });
  const items = Array.isArray(value) ? value : [];
  const keys = state.rowKeys[JSON.stringify(context.path)] ?? [];
  const label = i18n._(control.label);
  return (
    <fieldset
      className={styles.collectionFieldCollection}
      aria-describedby={context.field["aria-describedby"]}
    >
      <legend>
        {label} ({items.length}/{control.maxItems})
      </legend>
      {items.map((item, index) => (
        <CollectionItem
          {...{ ...remainingProps, control, context, preset, state, onChange }}
          key={keys[index]}
          item={item}
          index={index}
          count={items.length}
        />
      ))}
      <button
        disabled={items.length >= control.maxItems}
        onClick={() =>
          onChange(
            ContentDraftModule.addItem({
              preset,
              state,
              path: context.path,
              schema: control.itemSchema,
            }),
          )
        }
      >
        <Trans>Add {label} item</Trans>
      </button>
    </fieldset>
  );
}

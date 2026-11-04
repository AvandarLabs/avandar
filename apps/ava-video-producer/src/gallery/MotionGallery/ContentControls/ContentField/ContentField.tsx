import { ContentFieldBody } from "../ContentFieldBody/ContentFieldBody";
import { NullableField } from "../NullableField/NullableField";
import { useContentField } from "../useContentField";
import styles from "./ContentField.module.css";
import type {
  StockControl,
  StockPresetId,
} from "../../../../stock/contracts/StockContract.types";
import type { ContentDraft } from "../ContentDraftModule/ContentDraftModule";
import type { ReactNode } from "react";

/** Recursive editor context, including the nearest collection-item object. */
export type Props = {
  control: StockControl;
  parentPath: Array<string | number>;
  itemPath: Array<string | number>;
  preset: StockPresetId;
  state: ContentDraft;
  onChange: (state: ContentDraft) => void;
};
/** One named field exposes errors without discarding authored values. */
export function ContentField({
  control: providedControl,
  parentPath,
  preset,
  state,
  onChange,
  ...remainingProps
}: Readonly<Props>): ReactNode {
  const context = useContentField({
    ...remainingProps,
    control: providedControl,
    parentPath,
    preset,
    state,
    onChange,
  });
  return (
    <div className={styles.contentFieldField}>
      {providedControl.nullable ? (
        <NullableField control={providedControl} context={context} />
      ) : null}
      {context.value !== null ? (
        <ContentFieldBody
          {...{
            ...remainingProps,
            control: providedControl,
            parentPath,
            preset,
            state,
            onChange,
          }}
          context={context}
        />
      ) : null}
      {context.help ? (
        <p className={styles.contentFieldHelp} id={`${context.field.id}-help`}>
          {context.help}
        </p>
      ) : null}
    </div>
  );
}

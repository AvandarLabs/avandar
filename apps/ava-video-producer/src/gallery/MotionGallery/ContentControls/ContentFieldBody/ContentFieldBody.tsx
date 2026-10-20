import { match, P } from "ts-pattern";
import { CollectionField } from "../CollectionField/CollectionField";
import {
  ContentField,
  type Props as ContentFieldProps,
} from "../ContentField/ContentField";
import { ScalarField } from "../ScalarField/ScalarField";
import { UnionField } from "../UnionField/UnionField";
import styles from "./ContentFieldBody.module.css";
import type { ContentFieldContext } from "../useContentField";
import type { ReactNode } from "react";
type Props = ContentFieldProps & {
  context: ContentFieldContext;
};
/** Structural fields retain their native group names and relative paths. */
export function ContentFieldBody({
  control,
  context,
  ...remainingProps
}: Props): ReactNode {
  return match(control)
    .with({ kind: "object" }, (matchedControl) => {
      return (
        <fieldset
          className={styles.contentFieldBodyObject}
          aria-describedby={context.field["aria-describedby"]}
        >
          <legend>{context.label}</legend>
          {matchedControl.controls.map((child) => (
            <ContentField
              {...{ ...remainingProps, control: matchedControl, context }}
              key={child.path}
              control={child}
              parentPath={context.path}
            />
          ))}
        </fieldset>
      );
    })
    .with({ kind: "collection" }, (matchedControl) => {
      return (
        <CollectionField
          {...{ ...remainingProps, control: matchedControl, context }}
          control={matchedControl}
        />
      );
    })
    .with({ kind: "union" }, (matchedControl) => {
      return (
        <UnionField
          {...{ ...remainingProps, control: matchedControl, context }}
          control={matchedControl}
        />
      );
    })
    .with(
      { kind: P.union("text", "number", "boolean", "select") },
      (matchedControl) => {
        return (
          <>
            <label htmlFor={context.field.id}>{context.label}</label>
            <ScalarField
              {...{ ...remainingProps, control: matchedControl, context }}
              control={matchedControl}
            />
          </>
        );
      },
    )
    .exhaustive();
}

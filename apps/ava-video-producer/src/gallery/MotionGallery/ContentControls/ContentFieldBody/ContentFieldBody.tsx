import { match, P } from "ts-pattern";
import { CollectionField } from "../CollectionField/CollectionField";
import { type Props as ContentFieldProps } from "../ContentField/ContentField";
import { UnionField } from "../UnionField/UnionField";
import { LabeledScalarField } from "./LabeledScalarField/LabeledScalarField";
import { ObjectContentField } from "./ObjectContentField/ObjectContentField";
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
}: Readonly<Props>): ReactNode {
  return match(control)
    .with({ kind: "object" }, (matchedControl) => {
      return (
        <ObjectContentField {...{ matchedControl, context, remainingProps }} />
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
          <LabeledScalarField
            {...{ matchedControl, context, remainingProps }}
          />
        );
      },
    )
    .exhaustive();
}

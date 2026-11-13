import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { Checkbox } from "@mantine/core";
import type { NewDictionaryAction } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { ApplyTarget } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useOpenAfterCreate";
import type { Dispatch, ReactNode } from "react";

type Props = {
  appliesNext: boolean;
  /** The datasets the dictionary was learned from, the first opened next. */
  applyTargets: readonly ApplyTarget[];
  dispatch: Dispatch<NewDictionaryAction>;
};

/**
 * Whether saving goes on to apply the new dictionary: to the one dataset it
 * was learned from, or to the first of several.
 */
export function SaveApplyNextField({
  appliesNext,
  applyTargets,
  dispatch,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const [first] = applyTargets;
  if (!first) {
    return null;
  }
  const firstName = first.name;
  const label =
    applyTargets.length === 1
      ? t`Apply it to ${firstName} next`
      : plural(applyTargets.length, {
          one: "Apply it to this dataset after saving",
          other: "Apply it to these # datasets after saving",
        });
  return (
    <Checkbox
      label={label}
      description={
        applyTargets.length > 1
          ? t`${firstName} opens first. Apply it to the others from each dataset's menu.`
          : undefined
      }
      checked={appliesNext}
      onChange={(event) => {
        const isChecked = event.currentTarget.checked;
        dispatch({ type: "set_applies_next", appliesNext: isChecked });
      }}
    />
  );
}

import { useId } from "react";
import { getStockValueFromPath } from "../../../stock/data/getStockValueFromPath";
import { ContentDraftModule } from "./ContentDraftModule/ContentDraftModule";
import type { StockJsonValue } from "../../../stock/contracts/StockContract.types";
import type { Props } from "./ContentField/ContentField";
/** Data for useContentField. */
type UseContentFieldResult = {
  path: Array<string | number>;
  label: string;
  value: unknown;
  help: string | undefined;
  update: (replacement: StockJsonValue) => void;
  field: {
    id: string;
    "aria-label": string;
    "aria-invalid": boolean;
    "aria-describedby": string | undefined;
  };
};

/** Accessible field state shares validation paths across all editor kinds. */
export function useContentField({
  control,
  parentPath,
  preset,
  state,
  onChange,
}: Readonly<Props>): UseContentFieldResult {
  const id = useId();
  const path = _createContentPath({ parentPath, control });
  const issueIds = state.issues.flatMap((issue, index) => {
    return path.every((key, position) => {
      return issue.path[position] === key;
    })
      ? [`content-issue-${index}`]
      : [];
  });
  const describedBy =
    [control.help ? `${id}-help` : "", ...issueIds].filter(Boolean).join(" ") ||
    undefined;
  const label = /^\d+$/.test(control.path)
    ? `Cell ${path.join(".")}`
    : control.label.message;
  return {
    path,
    label,
    value: getStockValueFromPath({ value: state.draft, path }),
    help: control.help ? control.help.message : undefined,
    update: (replacement: StockJsonValue) => {
      return onChange(
        ContentDraftModule.edit({ preset, state, path, value: replacement }),
      );
    },
    field: {
      id,
      "aria-label": label,
      "aria-invalid": Boolean(issueIds.length),
      "aria-describedby": describedBy,
    },
  };
}
/** Derived field values and native accessibility attributes. */
export type ContentFieldContext = ReturnType<typeof useContentField>;

function _createContentPath({
  parentPath,
  control,
}: Readonly<
  Pick<Props, "parentPath" | "control">
>): UseContentFieldResult["path"] {
  return [
    ...parentPath,
    ...control.path
      .split(".")
      .filter(Boolean)
      .map((key) => {
        return /^\d+$/.test(key) ? Number(key) : key;
      }),
  ];
}

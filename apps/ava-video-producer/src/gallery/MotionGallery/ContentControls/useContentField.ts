import { useId } from "react";
import { getStockValueFromPath } from "../../../stock/copy/getStockValueFromPath/getStockValueFromPath";
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
  const path = [
    ...parentPath,
    ...control.path
      .split(".")
      .filter(Boolean)
      .map((key) => (/^\d+$/.test(key) ? Number(key) : key)),
  ];
  const issueIds = state.issues.flatMap((issue, index) =>
    path.every((key, position) => issue.path[position] === key)
      ? [`content-issue-${index}`]
      : [],
  );
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
    update: (replacement: StockJsonValue) =>
      onChange(
        ContentDraftModule.edit({ preset, state, path, value: replacement }),
      ),
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

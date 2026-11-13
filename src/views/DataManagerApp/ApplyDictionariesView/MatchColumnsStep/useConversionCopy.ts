import { useLingui } from "@lingui/react/macro";
import { canConvert } from "@/views/DataManagerApp/ApplyDictionariesView/applyTargets/applyTargets";
import type { ApplyTargets } from "@/views/DataManagerApp/ApplyDictionariesView/applyTargets/applyTargets";

/** The words the conversion controls use, translated once. */
export type ConversionCopy = {
  convertAllTooltip: string;
  referenceAllTooltip: string;
  convertTooltip: string;
  referenceTooltip: string;
  convertExplanation: string;
  referenceExplanation: string;
  /** Why nothing in this dataset can be converted, or undefined. */
  convertUnavailable: string | undefined;
};

function useConvertUnavailable(
  datasetName: string,
  targets: Readonly<ApplyTargets> | undefined,
): string | undefined {
  const { t } = useLingui();
  if (!targets || canConvert(targets) || targets.linked.isAvailable) {
    return undefined;
  }
  return targets.linked.reason === "dataset_limit"
    ? t`Converting ${datasetName} creates a linked dataset, and your plan's dataset limit is reached. You can still attach labels as reference.`
    : t`Converting ${datasetName} creates a linked dataset, and only workspace admins can add datasets. You can still attach labels as reference.`;
}

/**
 * The tooltips and explanations of the conversion controls, and why
 * converting is unavailable when it is.
 */
export function useConversionCopy(
  options: Readonly<{
    datasetName: string;
    targets: ApplyTargets | undefined;
  }>,
): ConversionCopy {
  const { t } = useLingui();
  return {
    convertAllTooltip: t`Changes the values in every column that has codes, using the labels from your dictionaries. Charts, filters, and downloads show the labels from then on.`,
    referenceAllTooltip: t`Leaves every column exactly as it is. Your dictionaries are attached alongside the data, so anyone can hover a column to see what its values mean, and Ask Avandar can use them to answer questions.`,
    convertTooltip: t`Changes the values in this column using the dictionary. For example, every 1 becomes Male, and charts, filters, and downloads show Male from then on.`,
    referenceTooltip: t`Leaves this column exactly as it is. The dictionary is attached alongside it, so anyone can hover the column to see what each value means, and Ask Avandar can use it to answer questions.`,
    convertExplanation: t`Your data will change. The labels stay attached too, so the column is still explained.`,
    referenceExplanation: t`Your data stays the same, which is what you want for models and exports that need the original values. Hover the column to see the labels.`,
    convertUnavailable: useConvertUnavailable(
      options.datasetName,
      options.targets,
    ),
  };
}

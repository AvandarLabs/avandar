import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ReactNode } from "react";

type Props = {
  datasetId: Dataset.Id;
  /** A dictionary to apply on its own, when the flow opened from one. */
  preselectedDictionaryId: DataDictionary.Id | undefined;
};

/**
 * Applies dictionaries to one dataset as reference. Renders nothing until
 * the flow's steps exist.
 */
export function ApplyDictionariesView(_props: Readonly<Props>): ReactNode {
  return null;
}

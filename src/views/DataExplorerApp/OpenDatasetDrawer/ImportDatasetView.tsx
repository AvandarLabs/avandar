import { DataImportTabs } from "@/views/DataManagerApp/DataImportView/DataImportTabs";
import { useCanAddDataset } from "@/views/DataManagerApp/DataImportView/useCanAddDataset";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

type Props = {
  onSaveSuccess: (dataset: Dataset.T) => void;
};

/**
 * Renders the standard "Import data" tabs (Upload, Connectors, Open data)
 * inside the Data Explorer's Open drawer. On successful save, the host
 * drawer is notified instead of redirecting to the dataset detail page.
 */
export function ImportDatasetView({ onSaveSuccess }: Props): JSX.Element {
  const isAddAllowed = useCanAddDataset();
  return (
    <DataImportTabs isAddAllowed={isAddAllowed} onSaveSuccess={onSaveSuccess} />
  );
}

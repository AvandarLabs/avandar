import { notifyError, notifySuccess, InputTextForm  } from "@ui";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

type Props = {
  dataset: Dataset.T;
};

export function EditDatasetView({ dataset }: Props): JSX.Element {
  const [updateDataset, isUpdatePending] = DatasetClient.useUpdate({
    queryToInvalidate: DatasetClient.QueryKeys.getAll(),
    onSuccess: () => {
      notifySuccess("Dataset updated successfully!");
    },
    onError: (err) => {
      notifyError("There was an error on update: " + err.message);
    },
  });

  return (
    <InputTextForm
      defaultValue={dataset.name}
      required
      hideLabel
      validateOnChange
      minLength={2}
      inputWidth={300}
      showSubmitButton
      submitButtonLabel="Save"
      isSubmitting={isUpdatePending}
      onSubmit={(newName) => {
        return updateDataset({
          id: dataset.id,
          data: { name: newName },
        });
      }}
    />
  );
}

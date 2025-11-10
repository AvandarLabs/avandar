import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { notifyError, notifySuccess } from "@/lib/ui/notifications/notify";
import { InputTextForm } from "@/lib/ui/singleton-forms/InputTextForm";
import { Dataset } from "@/models/datasets/Dataset";

type Props = {
  dataset: Dataset;
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

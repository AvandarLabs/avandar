import { DatasetClient } from "@/clients/datsets/DatasetClient";
import { notifyError } from "@/lib/ui/notifications/notifyError";
import { notifySuccess } from "@/lib/ui/notifications/notifySuccess";
import { InputTextField } from "@/lib/ui/singleton-forms/InputTextField";
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
    <InputTextField
      defaultValue={dataset.name}
      required
      hideLabel
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

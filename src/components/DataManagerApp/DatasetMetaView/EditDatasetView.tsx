import { notifyError } from "@/lib/ui/notifications/notifyError";
import { notifySuccess } from "@/lib/ui/notifications/notifySuccess";
import { InputTextField } from "@/lib/ui/singleton-forms/InputTextField";
import { LocalDatasetClient } from "@/models/LocalDataset/LocalDatasetClient";
import { LocalDataset } from "@/models/LocalDataset/types";

type Props = {
  dataset: LocalDataset;
};

export function EditDatasetView({ dataset }: Props): JSX.Element {
  const [updateDataset, isUpdatePending] = LocalDatasetClient.useUpdate({
    queryToInvalidate: LocalDatasetClient.QueryKeys.getAll(),
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

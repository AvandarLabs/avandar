import { notifyError } from "@/lib/ui/notifications/notifyError";
import { notifySuccess } from "@/lib/ui/notifications/notifySuccess";
import { InputTextField } from "@/lib/ui/singleton-forms/InputTextField";
import { LocalDatasetClient } from "@/models/LocalDataset/LocalDatasetClient";
import { LocalDataset } from "@/models/LocalDataset/types";

type Props = {
  dataset: LocalDataset;
};

function EditDatasetView({ dataset }: Props): JSX.Element {
  const [updateDataset, isUpdating] = LocalDatasetClient.useUpdateDataset({
    queryToInvalidate: LocalDatasetClient.QueryKeys.getAll(),
    onSuccess: () => {
      notifySuccess("Dataset updated!");
    },
    onError: (err) => {
      notifyError({
        title: "Update failed",
        message: err instanceof Error ? err.message : "Something went wrong",
      });
    },
  });

  return (
    <InputTextField
      defaultValue={dataset.name}
      label="Dataset Name"
      minLength={2}
      required
      showSubmitButton
      submitButtonLabel="Save"
      isSubmitting={isUpdating}
      onSubmit={(newName) => {
        updateDataset({
          id: dataset.id,
          updates: { name: newName },
        });
      }}
    />
  );
}

export default EditDatasetView;

import { Box } from "@mantine/core";
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
    <Box mt="md" mb="xl">
      <InputTextField
        defaultValue={dataset.name}
        label="Dataset Name"
        minLength={2}
        inputWidth={300}
        required
        showSubmitButton
        submitButtonLabel="Save"
        isSubmitting={isUpdating}
        onSubmit={(newName) =>
          {return updateDataset({
            id: dataset.id,
            updates: { name: newName },
          })}
        }
      />
    </Box>
  );
}

export default EditDatasetView;

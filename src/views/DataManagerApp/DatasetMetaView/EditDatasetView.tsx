import { useLingui } from "@lingui/react/macro";
import { notifyError, notifySuccess, InputTextForm  } from "@ui";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

type Props = {
  dataset: Dataset.T;
};

export function EditDatasetView({ dataset }: Props): JSX.Element {
  const { t } = useLingui();
  const [updateDataset, isUpdatePending] = DatasetClient.useUpdate({
    queryToInvalidate: DatasetClient.QueryKeys.getAll(),
    onSuccess: () => {
      notifySuccess(t`Dataset updated successfully!`);
    },
    onError: (err) => {
      notifyError(t`There was an error on update: ${err.message}`);
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
      submitButtonLabel={t`Save`}
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

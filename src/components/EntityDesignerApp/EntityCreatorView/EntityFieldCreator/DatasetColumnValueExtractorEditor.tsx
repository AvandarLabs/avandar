import { Group } from "@mantine/core";
import { useState } from "react";
import { LocalDatasetFieldSelect } from "@/components/common/LocalDatasetFieldSelect";
import { LocalDatasetSelect } from "@/components/common/LocalDatasetSelect";
import { FormType } from "@/lib/hooks/ui/useForm";
import { LocalDatasetId } from "@/models/LocalDataset/types";
import { EntityConfigForm } from "../entityCreatorTypes";

type Props = {
  entityConfigForm: FormType<EntityConfigForm>;
  fieldIdx: number;
};

export function DatasetColumnValueExtractorEditor({
  entityConfigForm,
  fieldIdx,
}: Props): JSX.Element {
  const [datasetId, setDatasetId] = useState<LocalDatasetId | undefined>(
    undefined,
  );
  entityConfigForm.watch(
    `fields.${fieldIdx}.datasetColumnValueConfig.datasetId`,
    ({ value }) => {
      setDatasetId(value);
    },
  );

  return (
    <Group>
      <LocalDatasetSelect
        key={entityConfigForm.key(
          `fields.${fieldIdx}.datasetColumnValueConfig.datasetId`,
        )}
        label="Dataset"
        {...entityConfigForm.getInputProps(
          `fields.${fieldIdx}.datasetColumnValueConfig.datasetId`,
        )}
      />
      <LocalDatasetFieldSelect
        key={entityConfigForm.key(
          `fields.${fieldIdx}.datasetColumnValueConfig.datasetFieldId`,
        )}
        label="Field"
        datasetId={datasetId}
        {...entityConfigForm.getInputProps(
          `fields.${fieldIdx}.datasetColumnValueConfig.datasetFieldId`,
        )}
      />
    </Group>
  );
}

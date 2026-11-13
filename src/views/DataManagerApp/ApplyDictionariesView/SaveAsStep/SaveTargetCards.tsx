import { Trans, useLingui } from "@lingui/react/macro";
import { Checkbox, Radio, Stack, Text, TextInput } from "@mantine/core";
import { AppViewSection } from "@/components/layouts/AppView/AppViewSection/AppViewSection";
import { ChangeDatasetCard } from "@/views/DataManagerApp/ApplyDictionariesView/SaveAsStep/ChangeDatasetCard";
import { LinkedDatasetCard } from "@/views/DataManagerApp/ApplyDictionariesView/SaveAsStep/LinkedDatasetCard";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type {
  ApplyDictionariesAction,
  ApplyDictionariesState,
  SaveTarget,
} from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import type { ApplyTargets } from "@/views/DataManagerApp/ApplyDictionariesView/applyTargets/applyTargets";
import type { Dispatch, ReactNode } from "react";

type Props = {
  dataset: Dataset.T;
  targets: ApplyTargets;
  state: ApplyDictionariesState;
  /** The linked dataset's name as typed, or its default. */
  linkedDatasetName: string;
  dispatch: Dispatch<ApplyDictionariesAction>;
};

/**
 * Where the converted values go, as radio cards: a new linked dataset, or
 * the dataset itself. Then the linked dataset's name, or, for a synced
 * upload changed in place, the confirmation that it changes the data for
 * everyone, and the reminder that the code lists are attached to the
 * dataset either way.
 */
export function SaveTargetCards(props: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const { dataset, targets, state, dispatch } = props;
  const datasetName = dataset.name;
  return (
    <AppViewSection title={<Trans>Save the conversions as</Trans>}>
      <Stack gap="md" maw="72ch">
        <Radio.Group
          value={state.saveTarget ?? ""}
          onChange={(value) => {
            dispatch({
              type: "set_save_target",
              saveTarget: value as SaveTarget,
            });
          }}
        >
          <Stack gap="sm">
            <LinkedDatasetCard
              datasetName={datasetName}
              linked={targets.linked}
            />
            <ChangeDatasetCard dataset={dataset} inPlace={targets.inPlace} />
          </Stack>
        </Radio.Group>
        {state.saveTarget === "linked" ? (
          <TextInput
            label={t`Name`}
            value={props.linkedDatasetName}
            onChange={(event) => {
              dispatch({
                type: "set_linked_name",
                name: event.currentTarget.value,
              });
            }}
          />
        ) : null}
        {state.saveTarget === "in_place" &&
        targets.inPlace.storage === "synced" ? (
          <Checkbox
            label={t`I understand this changes ${datasetName} for the whole workspace`}
            checked={state.hasConfirmedWorkspaceChange}
            onChange={(event) => {
              dispatch({
                type: "set_workspace_change_confirmed",
                isConfirmed: event.currentTarget.checked,
              });
            }}
          />
        ) : null}
        <Text size="sm" c="dimmed">
          {t`Either way, the code lists and descriptions are attached to ${datasetName} for reference.`}
        </Text>
      </Stack>
    </AppViewSection>
  );
}

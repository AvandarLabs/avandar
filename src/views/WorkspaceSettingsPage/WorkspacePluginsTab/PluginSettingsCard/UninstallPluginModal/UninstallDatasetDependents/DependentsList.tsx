import { Plural, useLingui } from "@lingui/react/macro";
import { List, Text } from "@mantine/core";
import type { DatasetDependent } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/UninstallPluginModal/useDatasetDependents/useDatasetDependents";

type Props = Readonly<{ dependents: readonly DatasetDependent[] }>;

/**
 * The things that read a dataset, each labelled with how it reads it, under
 * a sentence that says they stop working once the dataset is deleted. Used
 * by `UninstallDatasetDependents` once it has at least one to show.
 */
export function DependentsList({ dependents }: Props): JSX.Element {
  const { t } = useLingui();
  const dependentCount = dependents.length;
  return (
    <>
      <Text size="sm">
        <Plural
          value={dependentCount}
          one="This reads it and stops working once it is deleted:"
          other="These read it and stop working once it is deleted:"
        />
      </Text>
      <List size="sm">
        {dependents.map(({ key, kind, label }) => {
          return (
            <List.Item key={key}>
              {kind === "linkedDataset" ? t`${label} (linked dataset)` : label}
            </List.Item>
          );
        })}
      </List>
    </>
  );
}

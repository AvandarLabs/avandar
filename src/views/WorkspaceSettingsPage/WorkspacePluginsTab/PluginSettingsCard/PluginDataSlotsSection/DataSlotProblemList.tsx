import { useLingui } from "@lingui/react/macro";
import { List } from "@mantine/core";
import { match } from "ts-pattern";
import { useDataSlotAttributeTypeLabels } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/useDataSlotAttributeTypeLabels";
import { getOwnValue } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/getOwnValue/getOwnValue";
import type { DataSlotBindingProblem } from "@/lib/pluginDataSlots/getDataSlotBindingStatus/getDataSlotBindingStatus";
import type { PluginDataSlot } from "@avandar/plugin-manifest/runtime";

type Props = Readonly<{
  slot: PluginDataSlot;
  localize: (value: string) => string;
  problems: readonly DataSlotBindingProblem[];
}>;

/**
 * Why a data slot's binding is broken, one line per problem, naming the
 * attribute in the plugin's words. Shown under a broken slot on a plugin's
 * card, so an admin knows what to fix before choosing records again.
 */
export function DataSlotProblemList({
  slot,
  localize,
  problems,
}: Props): JSX.Element {
  const { t } = useLingui();
  const typeLabels = useDataSlotAttributeTypeLabels();
  const getProblemText = (problem: DataSlotBindingProblem): string => {
    if (problem.kind === "source_missing") {
      return t`The case type or dataset was deleted, or you cannot read it.`;
    }
    const attribute = getOwnValue(slot.attributes, problem.attributeKey);
    const attributeTitle =
      attribute === undefined
        ? problem.attributeKey
        : localize(attribute.title);
    const typeLabel = attribute === undefined ? "" : typeLabels[attribute.type];
    return match(problem.kind)
      .with("field_missing", () => {
        return t`The field for ${attributeTitle} no longer exists.`;
      })
      .with("type_mismatch", () => {
        return t`The field for ${attributeTitle} has the wrong type. It needs: ${typeLabel}.`;
      })
      .with("required_unmapped", () => {
        return t`${attributeTitle} has no field.`;
      })
      .exhaustive();
  };
  return (
    <List size="sm" c="danger">
      {problems.map((problem) => {
        const text = getProblemText(problem);
        return <List.Item key={text}>{text}</List.Item>;
      })}
    </List>
  );
}

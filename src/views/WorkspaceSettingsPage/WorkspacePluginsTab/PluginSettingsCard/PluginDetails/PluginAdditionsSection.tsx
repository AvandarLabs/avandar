import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { List, Text } from "@mantine/core";
import { useMemo } from "react";
import { PluginDetailsSection } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/PluginDetailsSection";
import type { TitleOrder } from "@mantine/core";
import type { ReactNode } from "react";

type Props = Readonly<{
  /** Data Explorer toolbar command titles, already localized. */
  toolbarCommandTitles: readonly string[];

  /** Chart type titles, already localized. */
  chartTypeTitles: readonly string[];

  /** Data slot titles, already localized. */
  dataSlotTitles: readonly string[];

  /** How many datasets the plugin bundles under `contributes.content`. */
  contentCount: number;

  /** How many tools the plugin gives Ask Avandar under `aiTools`. */
  aiToolCount: number;

  /** The section heading's level. See `PluginDetailsSection`. */
  headingOrder?: TitleOrder;
}>;

type AdditionLine = { key: string; isShown: boolean; text: ReactNode };

/** Each list of titles joined the way the reader's language joins a list. */
function useJoinedTitles(props: Props): {
  toolbarCommands: string;
  chartTypes: string;
  dataSlots: string;
} {
  const { i18n } = useLingui();
  // Narrow conjunctions keep a short run of names as "A, B" in English and
  // still use each locale's own separator, such as "、" in Chinese.
  const listFormat = useMemo(() => {
    return new Intl.ListFormat(i18n.locale, {
      type: "conjunction",
      style: "narrow",
    });
  }, [i18n.locale]);
  return {
    toolbarCommands: listFormat.format(props.toolbarCommandTitles),
    chartTypes: listFormat.format(props.chartTypeTitles),
    dataSlots: listFormat.format(props.dataSlotTitles),
  };
}

function useAdditionLines(props: Props): AdditionLine[] {
  const { t } = useLingui();
  const { toolbarCommands, chartTypes, dataSlots } = useJoinedTitles(props);
  return [
    {
      key: "toolbar",
      isShown: props.toolbarCommandTitles.length > 0,
      text: t`Data Explorer toolbar: ${toolbarCommands}`,
    },
    {
      key: "chartTypes",
      isShown: props.chartTypeTitles.length > 0,
      text: t`Chart types: ${chartTypes}`,
    },
    {
      key: "aiTools",
      isShown: props.aiToolCount > 0,
      text: (
        <Plural
          value={props.aiToolCount}
          one="# tool Ask Avandar can use"
          other="# tools Ask Avandar can use"
        />
      ),
    },
    {
      key: "dataSlots",
      isShown: props.dataSlotTitles.length > 0,
      text: t`Records you choose for it: ${dataSlots}`,
    },
    {
      key: "content",
      isShown: props.contentCount > 0,
      text: (
        <Plural
          value={props.contentCount}
          one="# dataset to import"
          other="# datasets to import"
        />
      ),
    },
  ];
}

/**
 * The "What it adds" block of a plugin's details: one line per place in the
 * app the plugin adds to, naming each addition, plus how many tools it gives
 * Ask Avandar, the records it asks an admin to choose for it, and how many
 * datasets it can import, so an admin knows what to look for and what to set
 * up after installing it. Lines with nothing to name are left out.
 */
export function PluginAdditionsSection(props: Props): JSX.Element {
  const lines = useAdditionLines(props).filter((line) => {
    return line.isShown;
  });
  return (
    <PluginDetailsSection
      title={<Trans>What it adds</Trans>}
      headingOrder={props.headingOrder}
    >
      {lines.length > 0 ? (
        <List size="sm">
          {lines.map((line) => {
            return <List.Item key={line.key}>{line.text}</List.Item>;
          })}
        </List>
      ) : (
        <Text size="sm" c="dimmed">
          <Trans>Nothing yet.</Trans>
        </Text>
      )}
    </PluginDetailsSection>
  );
}

import { Callout } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import { Center, Loader } from "@mantine/core";
import { IconTableOff } from "@tabler/icons-react";
import { AppSlateEmptyState } from "@/components/AppSlateEmptyState/AppSlateEmptyState";
import { DictionaryUsedByTable } from "@/views/DataManagerApp/DataDictionaryView/DictionaryUsedByTab/DictionaryUsedByTable";
import type { DictionaryUsage } from "@/views/DataManagerApp/DataDictionaryView/useDictionaryUsage/useDictionaryUsage";
import type { ReactNode } from "react";

type Props = {
  usage: DictionaryUsage;
};

/**
 * The datasets a dictionary is applied to and how. Applying it as reference
 * never changes the data and always shows the dictionary's latest version,
 * so every row is up to date.
 */
export function DictionaryUsedByTab({ usage }: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  if (usage.isLoading) {
    return (
      <Center p="xl">
        <Loader size="sm" />
      </Center>
    );
  }
  if (usage.hasError) {
    return (
      <Callout
        m="lg"
        title={t`Datasets failed to load`}
        titleOrder={3}
        titleSize="md"
        messageSize="sm"
        message={t`The datasets that use this dictionary failed to load. Please try again later or reach out to support.`}
      />
    );
  }
  if (usage.rows.length === 0) {
    return (
      <AppSlateEmptyState
        icon={<IconTableOff size={32} stroke={1.5} aria-hidden />}
        title={t`No datasets use this dictionary yet`}
        message={
          <Trans>
            Apply it to a dataset to explain its codes and describe its columns.
            The datasets it is applied to are listed here.
          </Trans>
        }
      />
    );
  }
  return <DictionaryUsedByTable rows={usage.rows} />;
}

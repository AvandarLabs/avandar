import { useLingui } from "@lingui/react/macro";
import { CloseButton, TextInput } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import type { ReactNode } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

/**
 * The catalog search field. `DataImportTabs` puts it on the tab row, beside
 * the Open data tab, so the query is typed there instead of in the filter rail.
 */
export function DataCatalogSearchField({
  value,
  onChange,
  className,
}: Props): ReactNode {
  const { t } = useLingui();

  return (
    <TextInput
      className={className}
      aria-label={t`Search open data`}
      placeholder={t`Search datasets`}
      leftSection={<IconSearch size={16} stroke={1.6} aria-hidden />}
      rightSection={
        value ? (
          <CloseButton
            size="sm"
            aria-label={t`Clear search`}
            onClick={() => {
              onChange("");
            }}
          />
        ) : null
      }
      value={value}
      onChange={(event) => {
        onChange(event.currentTarget.value);
      }}
    />
  );
}

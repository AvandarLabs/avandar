import { Trans, useLingui } from "@lingui/react/macro";
import { IconTableOff } from "@tabler/icons-react";
import { AppSlateEmptyState } from "@/components/AppSlateEmptyState/AppSlateEmptyState";
import type { ReactNode } from "react";

/**
 * The datasets that use a dictionary. Applying a dictionary to a dataset
 * is not built yet, so this always shows its empty state.
 */
export function DictionaryUsedByTab(): ReactNode {
  const { t } = useLingui();
  return (
    <AppSlateEmptyState
      icon={<IconTableOff size={32} stroke={1.5} aria-hidden />}
      title={t`No datasets use this dictionary yet`}
      message={
        <Trans>
          Datasets this dictionary is applied to will be listed here.
        </Trans>
      }
    />
  );
}

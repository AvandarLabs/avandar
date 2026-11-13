import { Trans, useLingui } from "@lingui/react/macro";
import { IconBook } from "@tabler/icons-react";
import { AppSlateEmptyState } from "@/components/AppSlateEmptyState/AppSlateEmptyState";
import type { ReactNode } from "react";

/** What Match columns shows when no dictionary is in use. */
export function NoDictionaryInUse(): ReactNode {
  const { t } = useLingui();
  return (
    <AppSlateEmptyState
      icon={<IconBook size={32} stroke={1.5} aria-hidden />}
      title={t`No dictionary matches these columns yet`}
      message={
        <Trans>
          Add a dictionary above to pick its entries for these columns by hand.
        </Trans>
      }
    />
  );
}

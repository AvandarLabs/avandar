import { useLingui } from "@lingui/react/macro";
import { Center, Loader } from "@mantine/core";
import { AppView } from "@/components/layouts/AppView/AppView";
import type { Crosswalk } from "$/models/crosswalks/Crosswalk/Crosswalk";
import type { ReactNode } from "react";

type Props = {
  /** Undefined for a new crosswalk. */
  crosswalkId: Crosswalk.Id | undefined;
};

/** A crosswalk: the datasets it maps and how, saved as a combined dataset. */
export function CrosswalkView(_props: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  return (
    <AppView>
      <Center flex={1}>
        <Loader size="sm" role="status" aria-label={t`Loading`} />
      </Center>
    </AppView>
  );
}

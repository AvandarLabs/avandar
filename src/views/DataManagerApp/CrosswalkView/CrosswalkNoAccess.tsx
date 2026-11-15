import { Callout } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { Center } from "@mantine/core";
import { AppView } from "@/components/layouts/AppView/AppView";
import type { ReactNode } from "react";

/** The crosswalk routes for someone who cannot edit crosswalks. */
export function CrosswalkNoAccess(): ReactNode {
  const { t } = useLingui();
  return (
    <AppView>
      <Center flex={1} p="lg">
        <Callout
          maw={520}
          title={t`You can't edit crosswalks`}
          message={t`Combining datasets needs edit access to Data Sources. Ask a workspace admin for it.`}
        />
      </Center>
    </AppView>
  );
}

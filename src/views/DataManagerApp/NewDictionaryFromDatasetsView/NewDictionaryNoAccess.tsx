import { Callout } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { Center } from "@mantine/core";
import { AppView } from "@/components/layouts/AppView/AppView";
import type { ReactNode } from "react";

/** The create route for someone who cannot edit dictionaries. */
export function NewDictionaryNoAccess(): ReactNode {
  const { t } = useLingui();
  return (
    <AppView>
      <Center flex={1} p="lg">
        <Callout
          maw={520}
          title={t`You can't create dictionaries`}
          message={t`Creating a dictionary needs edit access to Data Sources. Ask a workspace admin for it.`}
        />
      </Center>
    </AppView>
  );
}

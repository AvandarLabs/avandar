import { hasDefinedProps } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Button } from "@mantine/core";
import { IconRefresh } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { IndividualClient } from "@/clients/ontology/IndividualClient";
import { Logger } from "@/utils/Logger";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import {
  generateIndividuals,
  getAttributesWithMapping,
} from "@/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals/generateIndividuals";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ReactNode } from "react";

type Props = {
  concept: Concept.T;
  fullConcept: Concept.T<"Full">;
};

/**
 * Re-reads a case type's records from its source datasets. Afterwards every
 * record list and count is marked stale, so the page's record count shows
 * what the sync produced.
 */
export function RefreshRecordsButton({
  concept,
  fullConcept,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const onRefresh = async (): Promise<void> => {
    if (!hasDefinedProps(fullConcept, ["datasets", "attributes"])) {
      notifyError({
        title: t`Cannot sync this case type`,
        message: t`No attributes or dataset are configured.`,
      });
      return;
    }
    setIsRefreshing(true);
    try {
      await generateIndividuals({
        ...fullConcept,
        attributes: getAttributesWithMapping(fullConcept.attributes),
      });
      await queryClient.invalidateQueries({
        queryKey: [IndividualClient.getClientName()],
      });
      notifySuccess(t`Finished syncing ${concept.name} records`);
    } catch (error) {
      Logger.error(error, { msg: "Failed to sync case type records" });
      notifyError({
        title: t`Could not sync ${concept.name} records`,
        message:
          error instanceof Error
            ? error.message
            : t`An unexpected error occurred.`,
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Button
      variant="default"
      size="compact-sm"
      leftSection={<IconRefresh size={14} aria-hidden />}
      loading={isRefreshing}
      onClick={onRefresh}
    >
      {t`Refresh ${concept.name} records`}
    </Button>
  );
}

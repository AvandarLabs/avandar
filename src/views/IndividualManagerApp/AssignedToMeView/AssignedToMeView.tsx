import { makeIdLookupMap, where } from "@avandar/utils";
import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { useMemo } from "react";
import { ConceptClient } from "@/clients/ontology/ConceptClient";
import { ConceptStatusClient } from "@/clients/ontology/ConceptStatusClient";
import { IndividualClient } from "@/clients/ontology/IndividualClient";
import { AppSlate } from "@/components/layouts/AppSlate/AppSlate";
import { AppView } from "@/components/layouts/AppView/AppView";
import { AppViewBody } from "@/components/layouts/AppView/AppViewBody/AppViewBody";
import { AppViewHeader } from "@/components/layouts/AppView/AppViewHeader/AppViewHeader";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { AssignedToMeBody } from "@/views/IndividualManagerApp/AssignedToMeView/AssignedToMeBody";
import { useAssignedRecords } from "@/views/IndividualManagerApp/AssignedToMeView/useAssignedRecords";
import { groupRecordsByCaseType } from "@/views/IndividualManagerApp/groupRecordsByCaseType/groupRecordsByCaseType";
import type { ReactNode } from "react";

/**
 * The signed-in user's queue: every record assigned to them, across case
 * types, one section per case type. The header fact is the full count, not
 * the loaded page. Statuses are loaded once for the workspace so a row can
 * show its status dot without a status query per case type.
 */
export function AssignedToMeView(): ReactNode {
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();
  const userId = useCurrentUser()?.id;
  const assigned = useAssignedRecords(userId);
  const [count] = IndividualClient.useGetCount({
    where: { assigned_to: { eq: userId } },
    useQueryOptions: { enabled: userId !== undefined },
  });
  const [concepts] = ConceptClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );
  const [statuses] = ConceptStatusClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );
  const conceptsById = useMemo(() => {
    return makeIdLookupMap(concepts ?? []);
  }, [concepts]);
  const statusesById = useMemo(() => {
    return makeIdLookupMap(statuses ?? []);
  }, [statuses]);
  const groups = useMemo(() => {
    return groupRecordsByCaseType(assigned.records);
  }, [assigned.records]);
  const countFact =
    count === undefined || count === null
      ? undefined
      : plural(count, { one: "# record", other: "# records" });

  return (
    <AppSlate title={t`Assigned to me`}>
      <AppView>
        <AppViewHeader title={t`Assigned to me`} facts={[countFact]} />
        <AppViewBody>
          <AssignedToMeBody
            assigned={assigned}
            groups={groups}
            conceptsById={conceptsById}
            statusesById={statusesById}
          />
        </AppViewBody>
      </AppView>
    </AppSlate>
  );
}

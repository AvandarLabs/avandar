import { Trans, useLingui } from "@lingui/react/macro";
import { Alert, Button, Group, Stack, Text } from "@mantine/core";
import { PlanStateManager } from "@/components/ChatPanel/PlanStateManager/PlanStateManager";
import type {
  PlanApprovalStatus,
  PlanNode,
} from "@/components/ChatPanel/PlanStateManager/PlanStateManager";

type Props = {
  nodes: PlanNode[];
  approvalStatus: PlanApprovalStatus;
  dispatch: ReturnType<typeof PlanStateManager.useDispatch>;
};

/**
 * Status banners that sit between the plan header and the canvas:
 *
 *   - awaiting-approval prompt (with the >7-SQL-step hint) plus the
 *     Approve / Reject actions;
 *   - a rejected notice;
 *   - a failed-step notice;
 *   - an all-succeeded notice.
 *
 * Each banner is mutually gated on `approvalStatus` / node status, so at
 * most the relevant subset renders. Derived flags are computed here from
 * `nodes` because they are used nowhere else.
 */
export function PlanFlowBanners({
  nodes,
  approvalStatus,
  dispatch,
}: Props): React.ReactNode {
  const { t } = useLingui();

  const allSucceeded = nodes.every((n) => {
    return n.status === "succeeded";
  });
  const anyFailed = nodes.some((n) => {
    return n.status === "failed";
  });
  const sqlStepCount = nodes.filter((n) => {
    return n.type === "sql";
  }).length;
  // More than seven SQL steps suggests Python or R
  // might be a better fit. Show the hint, but allow the user to run
  // the plan anyway.
  const showSqlStepHint = sqlStepCount > 7;
  const isAwaitingApproval = approvalStatus === "awaiting_approval";
  const wasRejected = approvalStatus === "rejected";

  return (
    <>
      {isAwaitingApproval ?
        <Alert
          color="blue"
          variant="light"
          radius="sm"
          p="xs"
          title={t`Review and approve the plan`}
        >
          <Stack gap="xs">
            <Text size="xs">
              {showSqlStepHint ?
                <Trans>
                  The AI has proposed a {nodes.length}-step plan — that's a lot
                  of SQL. Consider whether a Python or R step would express this
                  more cleanly. You can still approve as-is. Nothing has run
                  yet. Click each node to read it; approve to execute.
                </Trans>
              : <Trans>
                  The AI has proposed a {nodes.length}-step plan. Nothing has
                  run yet. Click each node to read it; approve to execute.
                </Trans>
              }
            </Text>
            <Group gap="xs">
              <Button
                size="xs"
                color="green"
                onClick={() => {
                  dispatch.approvePlan();
                }}
              >
                <Trans>Approve and run</Trans>
              </Button>
              <Button
                size="xs"
                variant="outline"
                color="red"
                onClick={() => {
                  dispatch.rejectPlan();
                }}
              >
                <Trans>Reject</Trans>
              </Button>
            </Group>
          </Stack>
        </Alert>
      : null}

      {wasRejected ?
        <Alert color="gray" variant="light" radius="sm" p="xs">
          <Text size="xs">
            <Trans>
              Plan rejected. Ask the chat to propose a different plan, or close
              this canvas.
            </Trans>
          </Text>
        </Alert>
      : null}

      {anyFailed ?
        <Alert color="red" variant="light" radius="sm" p="xs">
          <Text size="xs">
            <Trans>
              A step failed. Click the red node to retry, or use Re-run to
              restart from the top.
            </Trans>
          </Text>
        </Alert>
      : null}

      {allSucceeded ?
        <Alert color="green" variant="light" radius="sm" p="xs">
          <Text size="xs">
            <Trans>
              All steps succeeded. Click any node to open it on the canvas.
            </Trans>
          </Text>
        </Alert>
      : null}
    </>
  );
}

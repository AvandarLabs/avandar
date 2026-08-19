import { prop, propEq } from "@avandar/utils";
import { i18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { ClarificationAuditEntryClient } from "@/clients/privacy/ClarificationAuditEntryClient/ClarificationAuditEntryClient";
import { applyChatTurnResponse } from "@/components/ChatPanel/applyChatTurnResponse/applyChatTurnResponse";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import { ChatAnalyticsPayloads } from "@/components/ChatPanel/useAvandarChatRuntime/ChatAnalyticsPayloads/ChatAnalyticsPayloads";
import {
  assumptionNeedsSignInOrApproval,
  buildSqlNotAppliedAssistantText,
} from "@/components/ChatPanel/useAvandarChatRuntime/chatRuntimeTurnHelpers";
import { shouldQueueDashboardBlock } from "@/components/ChatPanel/useAvandarChatRuntime/shouldQueueDashboardBlock/shouldQueueDashboardBlock";
import { decideIfDataCanCrossBoundary } from "@/components/privacy/privacy-helpers/decideIfDataCanCrossBoundary";
import { detectBias } from "@/components/privacy/privacy-helpers/detectBias/detectBias";
import {
  buildGeneratedSqlAssumptionAckText,
  reviewGeneratedSqlAssumptions,
} from "@/components/privacy/privacy-helpers/generatedSqlAssumptions/generatedSqlAssumptions";
import { AnalyticsClient } from "@/lib/analytics/AnalyticsClient";
import { notifyError } from "@/utils/notifications/notify";
import { buildPendingDashboardBlock } from "@/views/DashboardApp/AvaPage/pblocks/buildPendingDashboardBlock/buildPendingDashboardBlock";
import { DashboardEditorStateManager } from "@/views/DashboardApp/DashboardEditorStateManager/DashboardEditorStateManager";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import { applyCreatedCaseTypes } from "@/views/OntologyDesignerApp/applyCreatedCaseTypes/applyCreatedCaseTypes";
import type { ChatRuntimeCopy } from "@/components/ChatPanel/useAvandarChatRuntime/chatRuntimeTurnHelpers";
import type { DashboardEditorAppState } from "@/views/DashboardApp/DashboardEditorStateManager/DashboardEditorStateManager";
import type { useSqlToStructuredQuery } from "@/views/DataExplorerApp/QueryForm/useSqlToStructuredQuery";
import type { ChatModelRunResult } from "@assistant-ui/react";
import type { ChatClientMessage } from "$/models/chat/ChatClientMessage/ChatClientMessage";
import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext";
import type { ChatResponse } from "$/models/chat/ChatResponse/ChatResponse";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { MutableRefObject } from "react";

type ApplyChatModelTurnResponseOptions = {
  response: ChatResponse.T;
  apiMessages: readonly ChatClientMessage.T[];
  currentUser: User.T | undefined;
  currentPageContext: ChatPageContext.T;
  workspaceId: Workspace.Id;
  isGenerationStale: () => boolean;
  copyRef: MutableRefObject<ChatRuntimeCopy>;
  parseSqlRef: MutableRefObject<
    ReturnType<typeof useSqlToStructuredQuery>["parseSql"]
  >;
  dashboardEditorStateRef: MutableRefObject<DashboardEditorAppState>;
  dataExplorerDispatch: ReturnType<typeof DataExplorerStateManager.useDispatch>;
  dashboardEditorDispatch: ReturnType<
    typeof DashboardEditorStateManager.useDispatch
  >;
  chatPanelDispatch: ReturnType<typeof ChatPanelStateManager.useDispatch>;
};

async function reviewAndApplySql(
  options: Readonly<
    Pick<
      ApplyChatModelTurnResponseOptions,
      | "apiMessages"
      | "currentUser"
      | "workspaceId"
      | "isGenerationStale"
      | "parseSqlRef"
      | "dataExplorerDispatch"
    > & { sql: string }
  >,
): Promise<boolean> {
  const assumptionReview = reviewGeneratedSqlAssumptions({
    sql: options.sql,
    messages: options.apiMessages,
  });
  if (assumptionReview.needsApproval) {
    if (!options.currentUser) {
      return false;
    }
    const consent = await decideIfDataCanCrossBoundary({
      values: assumptionReview.unapprovedValues,
      text: buildGeneratedSqlAssumptionAckText(
        assumptionReview.unapprovedValues,
      ),
      context: "generated_sql_assumptions",
      workspaceId: options.workspaceId,
      userId: options.currentUser.id,
      explicitConsentRequired: assumptionReview.assumptionCapReached,
    });
    if (!consent.approved) {
      return false;
    }
  }
  if (options.isGenerationStale()) {
    return false;
  }
  const prompt =
    [...options.apiMessages].reverse().find(propEq("role", "user"))?.content ??
    "";
  options.dataExplorerDispatch.setRawSql(options.sql);
  options.dataExplorerDispatch.setNlPrompt(prompt);
  try {
    const mapping = options.parseSqlRef.current(options.sql);
    options.dataExplorerDispatch.applySqlMapping({
      query: mapping.query,
      isFullyMapped: mapping.isFullyMapped,
      unmappedReasons: mapping.unmappedReasons,
    });
  } catch {
    // ignore; the structured form will simply be out of sync.
  }
  void AnalyticsClient.logEvent({
    event: "chat.sql_generated",
    workspaceId: options.workspaceId,
    app: "data_explorer",
    payload: ChatAnalyticsPayloads.fromSql(options.sql),
  });
  return true;
}

/**
 * Applies SQL, dashboard blocks, and clarifications from a chat response
 * to the live page, or returns assistant text when SQL cannot be applied.
 */
export async function applyChatModelTurnResponse(
  options: Readonly<ApplyChatModelTurnResponseOptions>,
): Promise<ChatModelRunResult> {
  const sqlApplied =
    options.response.generatedSql ?
      await reviewAndApplySql({
        ...options,
        sql: options.response.generatedSql.sql,
      })
    : false;
  if (options.isGenerationStale()) {
    return { content: [] };
  }
  if (
    options.response.generatedSql &&
    !sqlApplied &&
    assumptionNeedsSignInOrApproval(options.response, options.apiMessages)
  ) {
    return {
      content: [
        {
          type: "text",
          text: buildSqlNotAppliedAssistantText(
            options.response.assistantText,
            options.currentUser,
            options.copyRef.current,
          ),
        },
      ],
    };
  }

  return applyChatTurnResponse({
    response: options.response,
    sqlApplied,
    sqlResultsOnCanvas: options.copyRef.current.sqlResultsOnCanvas,
    handlers: {
      queueDashboardBlock: (block) => {
        if (
          !shouldQueueDashboardBlock(options.currentPageContext.dashboardId)
        ) {
          return;
        }
        const payload = ChatAnalyticsPayloads.fromDashboardBlock({
          block,
          pageContext: options.currentPageContext,
          editorState: options.dashboardEditorStateRef.current,
        });
        options.dashboardEditorDispatch.queuePendingBlock({
          pendingId: crypto.randomUUID(),
          block: buildPendingDashboardBlock(block),
          dashboardId: options.currentPageContext.dashboardId,
        });
        void AnalyticsClient.logEvent({
          event: "dashboard.block_added_via_chat",
          workspaceId: options.workspaceId,
          app: "dashboards",
          payload,
        });
      },
      applyCreatedCaseTypes: (caseTypes) => {
        void applyCreatedCaseTypes({
          caseTypes,
          workspaceId: options.workspaceId,
        }).catch(() => {
          notifyError({
            title: i18n._(msg`Could not create those case types`),
          });
        });
      },
      setPendingClarification:
        options.chatPanelDispatch.setPendingClarification,
      setPendingCaseTypeDraft:
        options.chatPanelDispatch.setPendingCaseTypeDraft,
      recordClarificationShown: async (clarification) => {
        const questionBias = detectBias(clarification.question);
        if (questionBias.hits.length > 0) {
          console.warn(
            "[chat] LLM clarification trips bias detector; passing through:",
            questionBias.hits.map(prop("label")),
          );
        }
        return ClarificationAuditEntryClient.recordShown({
          workspaceId: options.workspaceId,
          request: clarification,
        });
      },
    },
  });
}

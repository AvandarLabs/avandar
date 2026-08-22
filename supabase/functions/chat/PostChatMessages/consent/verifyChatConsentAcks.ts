import { AvaHTTPError } from "@sbfn/_shared/AvaHTTPError.ts";
import { BAD_REQUEST } from "@sbfn/_shared/httpCodes.ts";
import { verifyAckToken } from "@sbfn/_shared/privacy/verifyAckToken.ts";
import { hashTextPayload } from "$/utils/privacy/sessionSecretUtils.ts";

type ConsentAck = {
  ackToken: string;
  scope:
    | { kind: "message_index"; index: number }
    | { kind: "values"; sourceColumn?: string };
};

/** Verifies consent proofs before a chat request can reach the LLM. */
export async function verifyChatConsentAcks(options: {
  consentAcks: ConsentAck[] | undefined;
  messages: ReadonlyArray<{ content: string }>;
  workspaceId: string;
  userId: string;
}): Promise<void> {
  if (!options.consentAcks || options.consentAcks.length === 0) {
    return;
  }

  for (const ack of options.consentAcks) {
    if (ack.scope.kind !== "message_index") {
      continue;
    }
    const message = options.messages[ack.scope.index];
    if (!message) {
      _rejectUnapprovedTransfer(
        `consentAck scope.index=${ack.scope.index} out of range`,
      );
    }

    const expectedHash = await hashTextPayload(message.content);
    const result = await verifyAckToken({
      token: ack.ackToken,
      expectedWorkspaceId: options.workspaceId,
      expectedUserId: options.userId,
      expectedPayloadHash: expectedHash,
    });
    if (!result.valid) {
      _rejectUnapprovedTransfer(
        `consentAck failed verification: ${result.reason}`,
      );
    }
  }
}

function _rejectUnapprovedTransfer(detail: string): never {
  throw new AvaHTTPError(`UNAPPROVED_DATA_TRANSFER: ${detail}`, BAD_REQUEST);
}

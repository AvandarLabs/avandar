import { formatFileSize } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { useEffect, useRef, useState, type RefObject } from "react";
import { FILE_URL_MAX_BYTES } from "$/fileUrl/PastedFileUrl.ts";
import { requestFileFromUrl } from "@/clients/fileUrl/requestFileFromUrl";
import { resolvePastedFileUrl } from "$/fileUrl/resolvePastedFileUrl/resolvePastedFileUrl.ts";
import { fileUrlErrorMessage } from "@/views/DataManagerApp/DataImportView/ManualUploadView/fileUrlErrorMessage";
import type { FileUrlChoiceMember, FileUrlFailureReason } from "$/fileUrl/AcquiredPastedFile.ts";

type Phase = "idle" | "fetching" | "choice";

/** What the upload page shows while a pasted link is downloading. */
export type FileUrlStatus = {
  fileName: string | undefined;
  sourceLabel: string;
};

/**
 * Owns the pasted-link field on the upload page: the address, the download,
 * and the choice when a link holds more than one data file. A finished file
 * is handed to `onFileReady`, which is the same path a dropped file takes.
 */
export function useFileUrlImport(onFileReady: (file: File) => void): {
  url: string;
  setUrl: (url: string) => void;
  phase: Phase;
  errorMessage: string | undefined;
  members: FileUrlChoiceMember[];
  status: FileUrlStatus | undefined;
  fieldRef: RefObject<HTMLInputElement | null>;
  submitUrl: () => void;
  chooseMember: (member: FileUrlChoiceMember) => void;
  returnToLink: () => void;
} {
  const { i18n } = useLingui();
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<FileUrlFailureReason | undefined>();
  const [members, setMembers] = useState<FileUrlChoiceMember[]>([]);
  const [pendingUrl, setPendingUrl] = useState("");
  const fieldRef = useRef<HTMLInputElement>(null);
  const [focusRequest, setFocusRequest] = useState(0);
  const limitLabel = formatFileSize(FILE_URL_MAX_BYTES, { locale: i18n.locale });

  useEffect(
    function focusLinkField() {
      if (focusRequest === 0 || phase !== "idle") {
        return;
      }
      fieldRef.current?.focus();
      fieldRef.current?.select();
    },
    [focusRequest, phase],
  );

  const submitUrl = (): void => {
    const trimmed = url.trim();
    const resolved = resolvePastedFileUrl(trimmed);
    if (resolved.kind === "refuse") {
      setError(resolved.reason);
      setPhase("idle");
      return;
    }
    setPendingUrl(trimmed);
    void _loadFileUrl({
      url: trimmed,
      stayOnChoice: false,
      setPhase,
      setError,
      setMembers,
      onFileReady,
    });
  };

  const chooseMember = (member: FileUrlChoiceMember): void => {
    void _loadFileUrl({
      url: member.url ?? pendingUrl,
      memberPath: member.url === undefined ? member.path : undefined,
      stayOnChoice: true,
      setPhase,
      setError,
      setMembers,
      onFileReady,
    });
  };

  const returnToLink = (): void => {
    setFocusRequest((request) => {
      return request + 1;
    });
    setPhase("idle");
    setError(undefined);
    setMembers([]);
  };

  return {
    url,
    setUrl: (next) => {
      setUrl(next);
      setError(undefined);
    },
    phase,
    errorMessage:
      error === undefined
        ? undefined
        : fileUrlErrorMessage(i18n, error, limitLabel),
    members,
    status: phase === "fetching" ? _statusForUrl(pendingUrl) : undefined,
    fieldRef,
    submitUrl,
    chooseMember,
    returnToLink,
  };
}

function _statusForUrl(value: string): FileUrlStatus | undefined {
  const resolved = resolvePastedFileUrl(value);
  if (resolved.kind === "refuse") {
    return undefined;
  }
  if (resolved.kind === "download") {
    return { fileName: resolved.fileName, sourceLabel: resolved.sourceLabel };
  }
  return { fileName: undefined, sourceLabel: resolved.sourceLabel };
}

async function _loadFileUrl(input: {
  url: string;
  memberPath?: string;
  stayOnChoice: boolean;
  setPhase: (phase: Phase) => void;
  setError: (error: FileUrlFailureReason | undefined) => void;
  setMembers: (members: FileUrlChoiceMember[]) => void;
  onFileReady: (file: File) => void;
}): Promise<void> {
  input.setError(undefined);
  input.setPhase("fetching");
  try {
    const acquired = await requestFileFromUrl(
      input.memberPath === undefined
        ? { url: input.url }
        : { url: input.url, memberPath: input.memberPath },
    );
    if (acquired.outcome === "error") {
      input.setError(acquired.reason);
      input.setPhase(input.stayOnChoice ? "choice" : "idle");
      return;
    }
    if (acquired.outcome === "choice") {
      input.setMembers(acquired.members);
      input.setPhase("choice");
      return;
    }
    input.setPhase("idle");
    input.setMembers([]);
    input.onFileReady(
      new File([acquired.bytes], acquired.fileName, {
        type: acquired.mediaType,
      }),
    );
  } catch {
    input.setError("unreachable");
    input.setPhase(input.stayOnChoice ? "choice" : "idle");
  }
}

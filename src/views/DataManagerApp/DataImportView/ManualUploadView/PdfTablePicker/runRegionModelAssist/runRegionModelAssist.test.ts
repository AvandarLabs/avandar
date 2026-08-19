import { ChatModelOption } from "$/models/chat/ChatModelOption/ChatModelOption";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { APIClient } from "@/clients/APIClient";
import { decideIfDataCanCrossBoundary } from "@/components/privacy/privacy-helpers/decideIfDataCanCrossBoundary";
import { PendingAcks } from "@/components/privacy/privacy-helpers/PendingAcks";
import { runRegionModelAssist } from "./runRegionModelAssist";
import type { CrossBoundaryRequest } from "@/components/privacy/privacy-helpers/decideIfDataCanCrossBoundary";
import type {
  ExtractedTable,
  PageGeometry,
  PdfRegion,
  TextItem,
} from "@/workers/pdfSniff/pdfSniff.types";
import type { Workspace } from "$/models/Workspace/Workspace";

vi.mock(
  "@/components/privacy/privacy-helpers/decideIfDataCanCrossBoundary",
  () => {
    return { decideIfDataCanCrossBoundary: vi.fn() };
  },
);

vi.mock("@/components/privacy/privacy-helpers/PendingAcks", () => {
  return { PendingAcks: { consumeAckForText: vi.fn() } };
});

vi.mock("@/clients/APIClient", () => {
  return { APIClient: { post: vi.fn() } };
});

const WORKSPACE_ID = "ws-1" as Workspace.Id;

const IN_REGION_SENTENCE = "There were 12 cases in Kassala.";
const OUT_OF_REGION_SENTENCE = "Confidential: 4 patient names follow.";

function _item(text: string, x: number, y: number): TextItem {
  return {
    text,
    x,
    y,
    width: text.length * 5,
    height: 10,
    fontName: "F1",
    unmappedCharRatio: 0,
  };
}

const PAGE: PageGeometry = {
  pageIndex: 0,
  width: 595,
  height: 842,
  textItems: [
    _item(IN_REGION_SENTENCE, 50, 700),
    _item(OUT_OF_REGION_SENTENCE, 50, 300),
  ],
  rules: [],
  looksScanned: false,
};

const REGION: PdfRegion = {
  id: "r1",
  label: "Highlights",
  shape: "prose_measures",
  detectionMode: "manual",
  fragments: [{ page: 0, bbox: [40, 650, 400, 750] }],
  options: {},
};

const COVERAGE_FLAG = {
  rowIndex: -1,
  columnIndex: -1,
  reason: "unmatched_value" as const,
  detail:
    "We read 1 of the 4 numbers in this region. Sentences that name their " +
    "subject indirectly are hard to read with rules alone.",
};

const RULE_TABLE: ExtractedTable = {
  regionId: "r1",
  cells: [
    ["subject", "metric", "value", "unit", "source_text"],
    ["Kassala", "cases", "12", "n", IN_REGION_SENTENCE],
  ],
  headerRows: 1,
  flags: [COVERAGE_FLAG],
  extractedBy: "rules",
  rowProvenance: [{ page: 0, bbox: [40, 650, 400, 750] }],
};

function _run(): ReturnType<typeof runRegionModelAssist> {
  return runRegionModelAssist({
    pages: [PAGE],
    region: REGION,
    ruleTable: RULE_TABLE,
    workspaceId: WORKSPACE_ID,
    userId: "user-1",
  });
}

function _approve(): void {
  vi.mocked(decideIfDataCanCrossBoundary).mockResolvedValue({
    approved: true,
    payload: {
      ackToken: "ack-1",
      values: [],
      text: undefined,
      context: "user_message_text",
      detected: { pii: [], bias: [] },
      acknowledgedAt: 0,
    },
  });
}

function _respondWith(assistantText: string): void {
  vi.mocked(APIClient.post).mockResolvedValue({
    assistantText,
  } as Awaited<ReturnType<typeof APIClient.post>>);
}

describe("runRegionModelAssist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(PendingAcks.consumeAckForText).mockResolvedValue("ack-1");
  });

  it("sends only the selected region's text across the boundary", async () => {
    // The user drew a box around one paragraph. That is what they consented
    // to; the rest of the page never leaves the device.
    _approve();
    _respondWith("[]");

    await _run();

    const request = vi.mocked(decideIfDataCanCrossBoundary).mock
      .calls[0]![0] as CrossBoundaryRequest;
    expect(request.text).toContain(IN_REGION_SENTENCE);
    expect(request.text).not.toContain("Confidential");
    expect(request.values).toEqual([IN_REGION_SENTENCE]);
    // Without values the PII detectors never see the text at all, and
    // without the forced modal a clean region would be sent silently.
    expect(request.explicitConsentRequired).toBe(true);
  });

  it("sends nothing at all when consent is refused", async () => {
    vi.mocked(decideIfDataCanCrossBoundary).mockResolvedValue({
      approved: false,
      reason: "cancelled",
    });

    const outcome = await _run();

    expect(APIClient.post).not.toHaveBeenCalled();
    expect(outcome).toEqual({
      kind: "skipped",
      reason: "consent_declined",
    });
  });

  it("attaches the consent ack to the request", async () => {
    // The ack is the server's proof that the gate ran. Sending without one
    // would leave a route to the model that the privacy log cannot see.
    _approve();
    _respondWith("[]");

    await _run();

    const body = vi.mocked(APIClient.post).mock.calls[0]![0]
      .body as unknown as {
      consentAcks?: ReadonlyArray<{ ackToken: string }>;
      model?: string;
    };
    expect(body.consentAcks).toEqual([
      { ackToken: "ack-1", scope: { kind: "message_index", index: 0 } },
    ]);
    expect(body.model).toBe(ChatModelOption.Catalog.defaultId);
  });

  it("appends the model's rows after the rule-based ones", async () => {
    _approve();
    _respondWith(
      JSON.stringify([
        {
          subject: "Gedaref",
          metric: "deaths",
          value: 3,
          unit: "n",
          sourceText: "and three deaths in Gedaref.",
        },
      ]),
    );

    const outcome = await _run();

    expect(outcome.kind).toBe("merged");
    if (outcome.kind !== "merged") {
      return;
    }
    expect(outcome.addedRowCount).toBe(1);
    expect(outcome.llmModel).toBe(ChatModelOption.Catalog.defaultId);
    expect(outcome.table.cells).toEqual([
      ["subject", "metric", "value", "unit", "source_text"],
      ["Kassala", "cases", "12", "n", IN_REGION_SENTENCE],
      ["Gedaref", "deaths", "3", "n", "and three deaths in Gedaref."],
    ]);
    // The coverage note was the offer, and it has now been taken.
    expect(outcome.table.flags).toEqual([]);
    expect(outcome.table.rowProvenance).toHaveLength(2);
  });

  it("keeps the rule-based rows when every model row is invalid", async () => {
    // "several" is not a measurement. Dropping the row leaves us with the
    // rules' answer, which is the honest one.
    _approve();
    _respondWith(
      JSON.stringify([
        {
          subject: null,
          metric: "deaths",
          value: "several",
          unit: "n",
          sourceText: "x",
        },
      ]),
    );

    const outcome = await _run();

    expect(outcome).toEqual({
      kind: "skipped",
      reason: "empty_model_response",
    });
  });

  it("keeps the rule-based rows when the answer is not data", async () => {
    _approve();
    _respondWith("I could not find any measurements.");

    const outcome = await _run();

    expect(outcome.kind).toBe("skipped");
  });
});

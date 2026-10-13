/**
 * Tests for the pure diff helpers behind incremental individual sync.
 */
import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import {
  diffStagedIndividualsPage,
  getNewlyStaleIndividuals,
} from "./diffStagedIndividualsHelpers";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { IndividualId } from "$/models/ontology/Individual/Individual.types";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ExistingIndividual } from "./diffStagedIndividualsHelpers";

const WORKSPACE_ID = uuid<Workspace.Id>();
const CONCEPT_ID = uuid<Concept.Id>();

function _makeExisting(
  overrides: Partial<ExistingIndividual> = {},
): ExistingIndividual {
  return {
    id: uuid<IndividualId>(),
    name: "Jane Doe",
    missingFromSourceAt: undefined,
    ...overrides,
  };
}

describe("diffStagedIndividualsPage", () => {
  it("writes a new row for a staged external_id with no existing match", () => {
    const { rowsToWrite, matchedExternalIds } = diffStagedIndividualsPage({
      stagedRows: [{ external_id: "ext-1", name: "Jane Doe" }],
      existingByExternalId: new Map(),
      workspaceId: WORKSPACE_ID,
      conceptId: CONCEPT_ID,
    });

    expect(rowsToWrite).toEqual([
      {
        workspace_id: WORKSPACE_ID,
        concept_id: CONCEPT_ID,
        external_id: "ext-1",
        name: "Jane Doe",
        missing_from_source_at: null,
      },
    ]);
    expect(matchedExternalIds).toEqual([]);
  });

  it("writes an updated row when the staged name differs from the existing one", () => {
    const { rowsToWrite, matchedExternalIds } = diffStagedIndividualsPage({
      stagedRows: [{ external_id: "ext-1", name: "Jane A. Doe" }],
      existingByExternalId: new Map([
        ["ext-1", _makeExisting({ name: "Jane Doe" })],
      ]),
      workspaceId: WORKSPACE_ID,
      conceptId: CONCEPT_ID,
    });

    expect(rowsToWrite).toEqual([
      {
        workspace_id: WORKSPACE_ID,
        concept_id: CONCEPT_ID,
        external_id: "ext-1",
        name: "Jane A. Doe",
        missing_from_source_at: null,
      },
    ]);
    expect(matchedExternalIds).toEqual(["ext-1"]);
  });

  it("writes nothing for a row whose name is unchanged and is not flagged missing", () => {
    const { rowsToWrite, matchedExternalIds } = diffStagedIndividualsPage({
      stagedRows: [{ external_id: "ext-1", name: "Jane Doe" }],
      existingByExternalId: new Map([
        ["ext-1", _makeExisting({ name: "Jane Doe" })],
      ]),
      workspaceId: WORKSPACE_ID,
      conceptId: CONCEPT_ID,
    });

    expect(rowsToWrite).toEqual([]);
    expect(matchedExternalIds).toEqual(["ext-1"]);
  });

  it("clears the stale flag for a row that reappears with an unchanged name", () => {
    const { rowsToWrite } = diffStagedIndividualsPage({
      stagedRows: [{ external_id: "ext-1", name: "Jane Doe" }],
      existingByExternalId: new Map([
        [
          "ext-1",
          _makeExisting({
            name: "Jane Doe",
            missingFromSourceAt: "2026-10-01T00:00:00.000Z",
          }),
        ],
      ]),
      workspaceId: WORKSPACE_ID,
      conceptId: CONCEPT_ID,
    });

    expect(rowsToWrite).toEqual([
      {
        workspace_id: WORKSPACE_ID,
        concept_id: CONCEPT_ID,
        external_id: "ext-1",
        name: "Jane Doe",
        missing_from_source_at: null,
      },
    ]);
  });
});

describe("getNewlyStaleIndividuals", () => {
  const NOW_ISO = "2026-10-13T00:00:00.000Z";

  it("flags an existing individual whose external_id was not matched this sync", () => {
    const staleRows = getNewlyStaleIndividuals({
      existingByExternalId: new Map([["ext-1", _makeExisting()]]),
      matchedExternalIds: new Set(),
      workspaceId: WORKSPACE_ID,
      conceptId: CONCEPT_ID,
      nowIso: NOW_ISO,
    });

    expect(staleRows).toEqual([
      {
        workspace_id: WORKSPACE_ID,
        concept_id: CONCEPT_ID,
        external_id: "ext-1",
        name: "Jane Doe",
        missing_from_source_at: NOW_ISO,
      },
    ]);
  });

  it("does not re-flag an individual already flagged missing", () => {
    const staleRows = getNewlyStaleIndividuals({
      existingByExternalId: new Map([
        [
          "ext-1",
          _makeExisting({ missingFromSourceAt: "2026-10-01T00:00:00.000Z" }),
        ],
      ]),
      matchedExternalIds: new Set(),
      workspaceId: WORKSPACE_ID,
      conceptId: CONCEPT_ID,
      nowIso: NOW_ISO,
    });

    expect(staleRows).toEqual([]);
  });

  it("does not flag an individual that was matched this sync", () => {
    const staleRows = getNewlyStaleIndividuals({
      existingByExternalId: new Map([["ext-1", _makeExisting()]]),
      matchedExternalIds: new Set(["ext-1"]),
      workspaceId: WORKSPACE_ID,
      conceptId: CONCEPT_ID,
      nowIso: NOW_ISO,
    });

    expect(staleRows).toEqual([]);
  });
});

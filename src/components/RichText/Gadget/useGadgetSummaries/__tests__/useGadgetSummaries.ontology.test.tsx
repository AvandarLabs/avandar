/**
 * Tests for the per-type gadget summary hooks. Every client hook is mocked,
 * so each case controls exactly what the lookups return.
 */
import { describe, expect, it } from "vitest";
import { useGadgetSummariesTestFixtures } from "./useGadgetSummariesTestFixtures";

const {
  useConceptSummary,
  useIndividualSummary,
  AppLinks,
  mocks,
  WORKSPACE_ID,
  OTHER_WORKSPACE_ID,
  CONCEPT_ID,
  INDIVIDUAL_ID,
  UPDATED_AT,
  UPDATED_LABEL,
  _ref,
  _renderSummary,
  _factPairs,
} = useGadgetSummariesTestFixtures;

describe("useConceptSummary", () => {
  it("summarizes a case type with its record and field counts", () => {
    mocks.useConceptById.mockReturnValue([
      { id: CONCEPT_ID, workspaceId: WORKSPACE_ID, name: "Measles case" },
      false,
    ]);
    mocks.useIndividualCount.mockReturnValue([38, false]);
    mocks.useConceptAttributeCount.mockReturnValue([6, false]);
    const summary = _renderSummary(
      useConceptSummary,
      _ref("concept", CONCEPT_ID),
    );
    const appLink = AppLinks.individualManagerHome({
      workspaceSlug: "nyc-doh",
      conceptId: CONCEPT_ID,
      conceptName: "Measles case",
    });
    expect(summary).toMatchObject({
      status: "available",
      name: "Measles case",
      link: { to: appLink.to, params: appLink.params },
    });
    expect(_factPairs(summary)).toEqual([
      ["Records", "38"],
      ["Fields", "6"],
    ]);
    expect(mocks.useIndividualCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: { concept_id: { eq: CONCEPT_ID } } }),
    );
    expect(mocks.useConceptAttributeCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: { concept_id: { eq: CONCEPT_ID } } }),
    );
  });

  it("is loading while the record count is fetched", () => {
    mocks.useConceptById.mockReturnValue([
      { id: CONCEPT_ID, workspaceId: WORKSPACE_ID, name: "Measles case" },
      false,
    ]);
    mocks.useIndividualCount.mockReturnValue([undefined, true]);
    expect(
      _renderSummary(useConceptSummary, _ref("concept", CONCEPT_ID)),
    ).toEqual({ status: "loading" });
  });

  it("skips both counts when facts are not needed", () => {
    mocks.useConceptById.mockReturnValue([
      { id: CONCEPT_ID, workspaceId: WORKSPACE_ID, name: "Measles case" },
      false,
    ]);
    const summary = _renderSummary(
      useConceptSummary,
      _ref("concept", CONCEPT_ID),
      { withFacts: false },
    );
    expect(summary).toMatchObject({ status: "available", facts: [] });
    expect(mocks.useIndividualCount).toHaveBeenCalledWith(
      expect.objectContaining({ useQueryOptions: { enabled: false } }),
    );
    expect(mocks.useConceptAttributeCount).toHaveBeenCalledWith(
      expect.objectContaining({ useQueryOptions: { enabled: false } }),
    );
  });
});

describe("useIndividualSummary", () => {
  it("summarizes a case with its case type", () => {
    mocks.useIndividualById.mockReturnValue([
      {
        id: INDIVIDUAL_ID,
        workspaceId: WORKSPACE_ID,
        name: "Amara Okafor",
        conceptId: CONCEPT_ID,
        updatedAt: UPDATED_AT,
      },
      false,
    ]);
    mocks.useConceptById.mockReturnValue([
      { id: CONCEPT_ID, workspaceId: WORKSPACE_ID, name: "Measles case" },
      false,
    ]);
    const summary = _renderSummary(
      useIndividualSummary,
      _ref("individual", INDIVIDUAL_ID),
    );
    const appLink = AppLinks.individualManagerIndividualView({
      workspaceSlug: "nyc-doh",
      conceptId: CONCEPT_ID,
      individualId: INDIVIDUAL_ID,
      individualName: "Amara Okafor",
    });
    expect(summary).toMatchObject({
      status: "available",
      name: "Amara Okafor",
      link: { to: appLink.to, params: appLink.params },
    });
    expect(_factPairs(summary)).toEqual([
      ["Case type", "Measles case"],
      ["Updated", UPDATED_LABEL],
    ]);
  });

  it("omits the Case type fact when the case type cannot be read", () => {
    mocks.useIndividualById.mockReturnValue([
      {
        id: INDIVIDUAL_ID,
        workspaceId: WORKSPACE_ID,
        name: "Amara Okafor",
        conceptId: CONCEPT_ID,
        updatedAt: UPDATED_AT,
      },
      false,
    ]);
    const summary = _renderSummary(
      useIndividualSummary,
      _ref("individual", INDIVIDUAL_ID),
    );
    expect(_factPairs(summary)).toEqual([["Updated", UPDATED_LABEL]]);
  });

  it("is loading while the case's case type is fetched", () => {
    mocks.useIndividualById.mockReturnValue([
      {
        id: INDIVIDUAL_ID,
        workspaceId: WORKSPACE_ID,
        name: "Amara Okafor",
        conceptId: CONCEPT_ID,
        updatedAt: UPDATED_AT,
      },
      false,
    ]);
    mocks.useConceptById.mockReturnValue([undefined, true]);
    expect(
      _renderSummary(useIndividualSummary, _ref("individual", INDIVIDUAL_ID)),
    ).toEqual({ status: "loading" });
  });

  it("skips the case type lookup when facts are not needed", () => {
    mocks.useIndividualById.mockReturnValue([
      {
        id: INDIVIDUAL_ID,
        workspaceId: WORKSPACE_ID,
        name: "Amara Okafor",
        conceptId: CONCEPT_ID,
        updatedAt: UPDATED_AT,
      },
      false,
    ]);
    _renderSummary(useIndividualSummary, _ref("individual", INDIVIDUAL_ID), {
      withFacts: false,
    });
    expect(mocks.useConceptById).toHaveBeenCalledWith(
      expect.objectContaining({ useQueryOptions: { enabled: false } }),
    );
  });

  it("is unavailable for a case in another workspace", () => {
    mocks.useIndividualById.mockReturnValue([
      {
        id: INDIVIDUAL_ID,
        workspaceId: OTHER_WORKSPACE_ID,
        conceptId: CONCEPT_ID,
        name: "Amara Okafor",
        updatedAt: UPDATED_AT,
      },
      false,
    ]);
    expect(
      _renderSummary(useIndividualSummary, _ref("individual", INDIVIDUAL_ID)),
    ).toEqual({ status: "unavailable" });
  });

  it("is unavailable when no case row comes back", () => {
    expect(
      _renderSummary(useIndividualSummary, _ref("individual", INDIVIDUAL_ID)),
    ).toEqual({ status: "unavailable" });
  });
});

import { Model } from "@avandar/models";
import { describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { render, screen } from "@/test-utils";
import { SingleIndividualView } from "@/views/IndividualManagerApp/SingleIndividualView";
import css from "@/views/IndividualManagerApp/SingleIndividualView/SingleIndividualView.module.css";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus";
import type { Individual } from "$/models/ontology/Individual/Individual";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";

vi.mock(
  "@/views/IndividualManagerApp/SingleIndividualView/useRecordFields/useRecordFields",
  () => {
    return {
      useRecordFields: () => {
        return {
          rows: [
            {
              id: "00000000-0000-4000-8000-0000000000b1",
              name: "Borough",
              dataType: "varchar",
              valueShape: "single",
              bucketGrain: undefined,
              value: "Brooklyn",
              sourceNames: ["02_nyc_measles_2018_19_cases_SIMULATED.csv"],
            },
          ],
          isLoadError: false,
          isRetrying: false,
          retry: () => {
            return undefined;
          },
        };
      },
    };
  },
);

vi.mock(
  "@/views/IndividualManagerApp/SingleIndividualView/useRecordStatusChange/useRecordStatusChange",
  () => {
    return {
      useRecordStatusChange: () => {
        return {
          displayedStatusId: "00000000-0000-4000-8000-0000000000a1",
          isSaving: false,
          changeStatus: () => {
            return undefined;
          },
        };
      },
    };
  },
);

vi.mock(
  "@/views/IndividualManagerApp/SingleIndividualView/useRecordAssigneeChange/useRecordAssigneeChange",
  () => {
    return {
      useRecordAssigneeChange: () => {
        return {
          displayedAssigneeId: undefined,
          isSaving: false,
          changeAssignee: () => {
            return undefined;
          },
        };
      },
    };
  },
);

vi.mock("@/hooks/permissions/useHasPermission/useHasPermission", () => {
  return {
    useHasPermission: () => {
      return false;
    },
  };
});

vi.mock("@/clients/ontology/ConceptStatusClient", () => {
  return {
    ConceptStatusClient: {
      useGetAll: () => {
        return [undefined];
      },
    },
  };
});

vi.mock("@/clients/WorkspaceClient", () => {
  return {
    WorkspaceClient: {
      useGetUsersForWorkspace: () => {
        return [[], false, { isError: false }];
      },
    },
  };
});

vi.mock(
  "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CaseActivityFeed",
  () => {
    return {
      CaseActivityFeed: () => {
        return <h4>Activity</h4>;
      },
    };
  },
);

const WORKSPACE_ID = uuid<Workspace.Id>();
const NOW = "2026-11-06T00:00:00.000Z";

const CONCEPT = Model.make("Concept", {
  id: uuid<Concept.Id>(),
  workspaceId: WORKSPACE_ID,
  ownerId: uuid<User.Id>(),
  name: "Measles case",
  description: undefined,
  createdAt: NOW,
  updatedAt: NOW,
  allowManualCreation: false,
  defaultStatusId: uuid<ConceptStatus.Id>(),
});

const RECORD: Individual.T = {
  assignedTo: undefined,
  conceptId: CONCEPT.id,
  createdAt: NOW,
  externalId: "SIM-0002",
  id: uuid<Individual.Id>(),
  missingFromSourceAt: undefined,
  name: "SIM-0002",
  statusId: CONCEPT.defaultStatusId,
  updatedAt: NOW,
  workspaceId: WORKSPACE_ID,
};

describe("SingleIndividualView", () => {
  it("keeps the case details in a fixed band above a separately scrolling activity feed", () => {
    render(
      <SingleIndividualView
        concept={CONCEPT}
        individual={RECORD}
        highlightedCommentId={undefined}
      />,
    );

    const details = screen.getByRole("heading", { name: "Details" });
    const activity = screen.getByRole("heading", { name: "Activity" });
    expect(
      details.compareDocumentPosition(activity) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);
    expect(details.closest("aside")).toBeNull();
    expect(screen.getByText("Brooklyn")).toBeInTheDocument();

    const detailsPane = screen.getByRole("region", { name: "Details" });
    const activityPane = screen.getByRole("region", { name: "Activity" });
    expect(detailsPane.contains(details)).toBe(true);
    expect(activityPane.contains(activity)).toBe(true);
    expect(detailsPane.contains(activity)).toBe(false);

    // jsdom does not apply CSS module rules, so the scroll contract is the
    // classes those rules live on. The band is the fixed-height scroller.
    // The activity pane is the other scroller.
    const { detailsBand, activityPane: activityPaneClass } = css;
    expect(detailsBand).toBeDefined();
    expect(activityPaneClass).toBeDefined();
    expect(detailsPane).toHaveClass(detailsBand ?? "");
    expect(activityPane).toHaveClass(activityPaneClass ?? "");
  });
});

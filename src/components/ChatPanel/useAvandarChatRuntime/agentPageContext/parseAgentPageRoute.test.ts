import { describe, expect, it } from "vitest";
import { parseAgentPageRoute } from "./parseAgentPageRoute";

const ID = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
const CHILD_ID = "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb";

describe("parseAgentPageRoute", () => {
  it.each([
    ["/acme/data-explorer", { app: "data-explorer" }],
    [`/acme/dashboards/edit/${ID}`, { app: "dashboard", id: ID }],
    [`/acme/dashboards/preview/${ID}`, { app: "dashboard", id: ID }],
    [`/acme/d/${ID}`, { app: "dashboard", id: ID }],
    ["/acme/d/measles-2026", { app: "dashboard", id: "measles-2026" }],
    ["/acme/dashboards", { app: "dashboards" }],
    [`/acme/data-manager/${ID}`, { app: "dataset", id: ID }],
    ["/acme/data-manager/data-import", { app: "data-sources" }],
    ["/acme/data-manager", { app: "data-sources" }],
    [`/acme/map/${ID}`, { app: "map", id: ID }],
    [`/acme/individual-manager/${ID}`, { app: "case-type", id: ID }],
    [
      `/acme/individual-manager/${ID}/${CHILD_ID}`,
      { app: "case", id: CHILD_ID, parentId: ID },
    ],
    ["/acme/ontology-designer", { app: "case-manager" }],
    ["/acme/settings", { app: "other" }],
  ])("reads %s", (pathname, expected) => {
    expect(parseAgentPageRoute(pathname)).toEqual(expected);
  });

  it("does not read a uuid followed by more characters", () => {
    expect(parseAgentPageRoute(`/acme/map/${ID}extra`)).toEqual({
      app: "other",
    });
  });
});
